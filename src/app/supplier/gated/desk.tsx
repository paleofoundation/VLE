"use client";
import { useState, type FormEvent } from "react";
import type { GatedService } from "@/gated/service";
import type { Event } from "@/gated/model";
type Desk = Awaited<ReturnType<GatedService["management"]>>;
const endpoint = "/api/gated";
const value = (f: FormData, name: string) => String(f.get(name) ?? "");
const timestamp = (f: FormData, name: string) =>
  new Date(value(f, name)).getTime();
export function GatedDesk() {
  const [desk, setDesk] = useState<Desk>();
  const [history, setHistory] = useState<Event[]>([]);
  const [notice, setNotice] = useState("");
  const [issued, setIssued] = useState<{
    invitationId: string;
    code: string;
  }>();
  async function load() {
    setNotice("");
    try {
      const response = await fetch(`${endpoint}?operation=management`, {
        cache: "no-store",
      });
      if (!response.ok) throw Error();
      setDesk(await response.json());
    } catch {
      setDesk(undefined);
      setNotice(
        "Access unavailable. Login, current eligibility and supplier management assignment are required.",
      );
    }
  }
  async function mutate(body: object) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) throw Error();
    return response.json();
  }
  async function run(body: object) {
    try {
      await mutate(body);
      await load();
      setNotice("Recorded.");
    } catch {
      setNotice("Access unavailable.");
    }
  }
  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIssued(undefined);
    const f = new FormData(event.currentTarget);
    try {
      setIssued(
        await mutate({
          operation: "issue",
          recipient: {
            userId: value(f, "userId"),
            organizationId: value(f, "organizationId"),
          },
          versions: f.getAll("versions"),
          actions: f.getAll("actions"),
          codeExpires: timestamp(f, "codeExpires"),
          grantExpires: timestamp(f, "grantExpires"),
        }),
      );
      await load();
    } catch {
      setNotice("Access unavailable.");
    }
  }
  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    form.reset();
    try {
      await mutate({
        operation: "redeem",
        invitationId: value(f, "invitationId"),
        code: value(f, "code"),
      });
      setNotice(
        "Code redeemed. Only the selected document versions and actions are available.",
      );
    } catch {
      setNotice("Access unavailable.");
    }
  }
  async function logs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const query = new URLSearchParams({ operation: "history" });
    for (const key of ["versionId", "userId", "action", "outcome"])
      if (value(f, key)) query.set(key, value(f, key));
    for (const key of ["from", "until"])
      if (value(f, key)) query.set(key, String(timestamp(f, key)));
    try {
      const response = await fetch(`${endpoint}?${query}`, {
        cache: "no-store",
      });
      if (!response.ok) throw Error();
      setHistory(await response.json());
    } catch {
      setHistory([]);
      setNotice("Access unavailable.");
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const file = f.get("file") as File;
    try {
      const query = new URLSearchParams({
        operation: "upload",
        subject: value(f, "subject"),
        subjectId: value(f, "subjectId"),
        validUntil: String(timestamp(f, "validUntil")),
      });
      const response = await fetch(`${endpoint}?${query}`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-File-Name": file.name },
        body: file,
        cache: "no-store",
      });
      if (!response.ok) throw Error();
      await load();
      setNotice(
        "Uploaded to quarantine. Inspection is required before release.",
      );
    } catch {
      setNotice("Access unavailable.");
    }
  }
  return (
    <>
      <p role="status">{notice}</p>
      <section>
        <h2>Redeem your code</h2>
        <form onSubmit={redeem}>
          <label>
            Invitation ID
            <input name="invitationId" required />
          </label>
          <label>
            Authorization code
            <input name="code" type="password" autoComplete="off" required />
          </label>
          <button>Redeem</button>
        </form>
      </section>
      <section>
        <h2>Read an authorized document</h2>
        <form action={endpoint} method="get">
          <label>
            Document version ID
            <input name="versionId" required />
          </label>
          <label>
            Action
            <select name="operation">
              <option value="metadata">Metadata</option>
              <option value="preview">Preview as safe file</option>
              <option value="download">Download</option>
            </select>
          </label>
          <button>Open authorized document</button>
        </form>
      </section>
      <button onClick={load}>Load supplier controls</button>
      {desk ? (
        <section>
          <h2>Supplier controls</h2>
          <form onSubmit={upload}>
            <h3>Quarantine upload</h3>
            <label>
              Subject
              <select name="subject">
                <option>LOT</option>
                <option>PROFILE</option>
              </select>
            </label>
            <label>
              Subject ID
              <input name="subjectId" required />
            </label>
            <label>
              Available until
              <input name="validUntil" type="datetime-local" required />
            </label>
            <label>
              File
              <input name="file" type="file" required />
            </label>
            <button>Upload to quarantine</button>
          </form>
          <h3>Document versions</h3>
          <ul>
            {desk.versions.map((v) => (
              <li key={v.id}>
                {v.fileName}: {v.id}, {v.scan},{" "}
                {v.available ? "available" : "unavailable"}{" "}
                {v.scan === "quarantine" ? (
                  <button
                    onClick={() => run({ operation: "scan", versionId: v.id })}
                  >
                    Inspect
                  </button>
                ) : null}
                <button
                  onClick={() =>
                    run({ operation: "withdraw", versionId: v.id })
                  }
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={issue}>
            <h3>Issue a named-user code</h3>
            <label>
              Recipient user ID
              <input name="userId" required />
            </label>
            <label>
              Recipient organization ID
              <input name="organizationId" required />
            </label>
            <fieldset>
              <legend>Exact versions</legend>
              {desk.versions
                .filter((v) => v.available && v.scan === "clean")
                .map((v) => (
                  <label key={v.id}>
                    <input name="versions" type="checkbox" value={v.id} />
                    {v.fileName} ({v.id})
                  </label>
                ))}
            </fieldset>
            <fieldset>
              <legend>Permitted actions</legend>
              <label>
                <input name="actions" type="checkbox" value="view" />
                View
              </label>
              <label>
                <input name="actions" type="checkbox" value="download" />
                Download
              </label>
            </fieldset>
            <label>
              Code expires
              <input name="codeExpires" type="datetime-local" required />
            </label>
            <label>
              Grant expires
              <input name="grantExpires" type="datetime-local" required />
            </label>
            <button>Issue code</button>
          </form>
          {issued ? (
            <div role="status">
              <p>Copy now. This code cannot be recovered.</p>
              <p>Invitation: {issued.invitationId}</p>
              <code>{issued.code}</code>
              <button onClick={() => setIssued(undefined)}>Clear code</button>
            </div>
          ) : null}
          <h3>Invitations</h3>
          <ul>
            {desk.invitations.map((i) => (
              <li key={i.id}>
                {i.id}: {i.status}, recipient {i.recipient.userId}, expires{" "}
                {new Date(i.grantExpires).toISOString()}
                {i.status === "issued" ? (
                  <button
                    onClick={() =>
                      run({ operation: "cancel", invitationId: i.id })
                    }
                  >
                    Cancel unused code
                  </button>
                ) : null}
                <button
                  onClick={() =>
                    run({ operation: "revoke", invitationId: i.id })
                  }
                >
                  Revoke code and grant
                </button>
              </li>
            ))}
          </ul>
          <h3>Narrow grants</h3>
          {desk.grants
            .filter((g) => !g.revoked)
            .map((g) => (
              <form
                key={g.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void run({
                    operation: "narrow",
                    grantId: g.id,
                    versions: f.getAll("versions"),
                    actions: f.getAll("actions"),
                    expires: timestamp(f, "expires"),
                  });
                }}
              >
                <p>{g.id}</p>
                {g.versions.map((v) => (
                  <label key={v}>
                    <input
                      name="versions"
                      type="checkbox"
                      value={v}
                      defaultChecked
                    />
                    {v}
                  </label>
                ))}
                {g.actions.map((a) => (
                  <label key={a}>
                    <input
                      name="actions"
                      type="checkbox"
                      value={a}
                      defaultChecked
                    />
                    {a}
                  </label>
                ))}
                <label>
                  Earlier expiry
                  <input name="expires" type="datetime-local" required />
                </label>
                <button>Narrow access</button>
              </form>
            ))}
          <h3>Supplier access history</h3>
          <p>
            Allowed requests and server delivery observations do not prove a
            person read the file.
          </p>
          <form onSubmit={logs}>
            {["versionId", "userId", "action", "outcome"].map((k) => (
              <label key={k}>
                {k}
                <input name={k} />
              </label>
            ))}
            <label>
              From
              <input name="from" type="datetime-local" />
            </label>
            <label>
              Until
              <input name="until" type="datetime-local" />
            </label>
            <button>Load history</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Organization</th>
                <th>User</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Reason</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.at).toISOString()}</td>
                  <td>{e.organizationName}</td>
                  <td>{e.displayName}</td>
                  <td>{e.action}</td>
                  <td>{e.outcome}</td>
                  <td>{e.reason}</td>
                  <td>{e.versionId ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
