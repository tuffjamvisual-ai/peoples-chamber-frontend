export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#002633] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-[#c9c9c9] mb-4">Last updated: March 28, 2026</p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Information We Collect</h2>
        <p className="text-[#c9c9c9] mb-4">People's Chamber collects minimal personal information:</p>
        <ul className="list-disc list-inside text-[#c9c9c9] mb-4 space-y-2">
          <li>Email address (for account creation)</li>
          <li>Username (public display name)</li>
          <li>Postcode (optional, for constituency matching)</li>
          <li>Voting history on Parliamentary bills</li>
          <li>Comments posted on bills</li>
        </ul>

        <h2 className="text-xl font-bold mt-6 mb-3">How We Use Your Information</h2>
        <p className="text-[#c9c9c9] mb-4">Your information is used to:</p>
        <ul className="list-disc list-inside text-[#c9c9c9] mb-4 space-y-2">
          <li>Provide access to the People's Chamber platform</li>
          <li>Display aggregated voting statistics</li>
          <li>Match you with your local MP (if postcode provided)</li>
          <li>Enable community discussions on bills</li>
        </ul>

        <h2 className="text-xl font-bold mt-6 mb-3">Data Storage</h2>
        <p className="text-[#c9c9c9] mb-4">
          All data is stored securely using Supabase (PostgreSQL database) with industry-standard encryption. We do not sell or share your personal information with third parties.
        </p>

        <h2 className="text-xl font-bold mt-6 mb-3">Your Rights</h2>
        <p className="text-[#c9c9c9] mb-4">You have the right to:</p>
        <ul className="list-disc list-inside text-[#c9c9c9] mb-4 space-y-2">
          <li>Access your personal data</li>
          <li>Delete your account and all associated data</li>
          <li>Export your voting history</li>
          <li>Opt out of data collection</li>
        </ul>

        <h2 className="text-xl font-bold mt-6 mb-3">Contact</h2>
        <p className="text-[#c9c9c9] mb-4">
          For privacy concerns or data requests, contact: tuffjamvisual@gmail.com
        </p>
      </div>
    </div>
  );
}
