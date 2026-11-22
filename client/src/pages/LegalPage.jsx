import { Link, useLocation } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'

const SUPPORT_EMAIL = 'support@synapseeducore.com'
const SUPPORT_PHONE = '+92-300-0000000'

const CONTENT = {
  about: {
    title: 'About Us',
    body: [
      'Synapse EduCore is a school management platform built for schools in Pakistan and beyond. We help administrators, teachers, and parents stay connected — attendance, fees, exams, communication, and AI-assisted routines in one place.',
      'Our goal is simple: save staff time so schools can focus on students. Time is your real money — every hour spent on manual registers and scattered WhatsApp threads is an hour lost from teaching and leadership.',
      'Synapse EduCore is product software provided on a subscription basis. Schools control their own data and remain responsible for accuracy of student, parent, and fee records entered into the system.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'Last updated: November 2026',
      'This policy describes how Synapse EduCore (“we”, “the Service”) handles information when a school uses our software.',
      'Data we process: School account details (name, admin email, phone), staff and student records entered by the school, parent contact numbers for messaging, fee and attendance data, and technical logs needed to run the Service (e.g. login security, error diagnostics).',
      'Who controls the data: The school is the primary controller of student and parent data it uploads. We process that data to provide the Service the school subscribes to.',
      'We do not sell personal data. We do not use school student data to train public AI models. Optional AI features (Ask AI / insights) send only the minimum context required for that request to configured AI providers under the school’s plan limits.',
      'Hosting: Data is stored on infrastructure providers we use (database and application hosting). Access is restricted to authorized operations.',
      'Retention: Data remains while the school account is active. After subscription expiry and any grace period defined in product settings, data may be deleted or made inaccessible as described in product notices.',
      'Parents and students: Contact your school administration for corrections to records. For platform privacy questions, email ' + SUPPORT_EMAIL + '.',
      'Security: We use industry-standard measures (encrypted transport, authenticated APIs, plan-based access controls). No method of transmission is 100% secure; schools should protect admin passwords and devices.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: [
      'Last updated: November 2026',
      'By creating an account or using Synapse EduCore you agree to these Terms.',
      'The Service: We provide school management software (modules may vary by plan: Starter, Standard, Premium, and free trial). Features may change as we improve the product. Trial access is for evaluation and may have limits.',
      'School responsibilities: You must provide accurate information, keep login credentials secure, and comply with applicable education and data laws for your students and parents. You are responsible for content you send via messaging and for obtaining any consents required to contact parents.',
      'Acceptable use: No abuse, scraping, attempts to bypass plan limits or security, illegal content, or harm to other users or our infrastructure.',
      'Plans & billing: Paid plans are charged according to prices shown at purchase. Free trial converts only if you choose a paid plan. We may suspend access for non-payment or policy violations after notice where practical.',
      'Availability: We aim for reliable uptime but do not guarantee uninterrupted service. Maintenance and third-party outages can occur.',
      'Limitation of liability: To the maximum extent permitted by law, Synapse EduCore is not liable for indirect or consequential losses, including lost fees collection or academic decisions made using the software. Our total liability for a claim is limited to fees paid for the Service in the three months before the claim.',
      'Contact: ' + SUPPORT_EMAIL,
    ],
  },
  refund: {
    title: 'Cancellation & Refund Policy',
    body: [
      'Last updated: November 2026',
      'Free trial: Trial access is free. No payment is taken for the trial period itself, so no refund applies to unused trial days.',
      'Cancellation: You may stop using the Service and request account closure by contacting support. Cancellation stops future billing once processed; it does not automatically refund past periods already paid unless required below.',
      'Refunds on first paid period: If you purchase a paid plan and have not meaningfully used paid-only modules, you may request a refund within 7 days of the first successful paid charge by emailing ' + SUPPORT_EMAIL + ' with your school name and registered admin email. We review case by case.',
      'No refund in general for: partial months after active use, change of mind after heavy data entry and messaging use, or violation of Terms.',
      'How to request: Email ' + SUPPORT_EMAIL + ' with subject “Refund request”, school name, admin email, and reason. We respond within a reasonable time.',
      'This policy may be updated; the version on this page at the time of purchase applies to that purchase.',
    ],
  },
  contact: {
    title: 'Contact Us',
    body: [
      'We are here to help schools evaluate and run Synapse EduCore.',
      'Email: ' + SUPPORT_EMAIL,
      'Phone / WhatsApp: ' + SUPPORT_PHONE + ' (update with your live support number)',
      'For account access, trial questions, billing, or data requests, include your school name and admin email so we can locate your account quickly.',
      'Product feedback and pilot school support are welcome during early access.',
    ],
  },
}

export default function LegalPage() {
  const { pathname } = useLocation()
  const key = pathname.replace(/^\//, '') || 'about'
  const page = CONTENT[key] || CONTENT.about

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      <header
        className="bg-white border-b px-4 sm:px-8 py-4 flex items-center justify-between gap-4"
        style={{ borderColor: '#e2e8f0' }}
      >
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img src="/pwa-icon-192.png" alt="" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <div className="font-bold text-slate-900" style={{ fontFamily: 'Syne,sans-serif' }}>
              Synapse EduCore
            </div>
            <div className="text-[11px] text-slate-500">Time is your real money.</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="text-sm px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-sm px-3 py-2 rounded-lg text-white font-semibold"
            style={{ background: '#0284c7' }}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full px-4 sm:px-8 py-10" style={{ maxWidth: 720 }}>
        <h1 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Syne,sans-serif' }}>
          {page.title}
        </h1>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          {page.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/" className="text-sm font-semibold" style={{ color: '#0284c7' }}>
            ← Back to Login
          </Link>
        </div>
      </main>

      <SiteFooter variant="dark" />
    </div>
  )
}
