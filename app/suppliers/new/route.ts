import {onboardingPage} from '../../../server/onboarding-pages.js';
export function GET(){return new Response(onboardingPage(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
