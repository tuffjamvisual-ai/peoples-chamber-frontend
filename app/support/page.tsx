export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#002633] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Support</h1>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Contact Us</h2>
        <p className="text-[#c9c9c9] mb-4">Email: tuffjamvisual@gmail.com</p>

        <h2 className="text-xl font-bold mt-6 mb-3">Frequently Asked Questions</h2>
        
        <h3 className="font-bold mt-4 mb-2 text-[#9bdd42]">How does voting work?</h3>
        <p className="text-[#c9c9c9] mb-4">
          Create an account, browse bills, and click Support, Oppose, or Abstain. Your vote is recorded and contributes to public opinion statistics.
        </p>

        <h3 className="font-bold mt-4 mb-2 text-[#9bdd42]">Where does the data come from?</h3>
        <p className="text-[#c9c9c9] mb-4">
          All bill and MP data comes from official UK Parliament APIs at parliament.uk
        </p>

        <h3 className="font-bold mt-4 mb-2 text-[#9bdd42]">Can I change my vote?</h3>
        <p className="text-[#c9c9c9] mb-4">
          No, votes are final once submitted to maintain data integrity.
        </p>

        <h3 className="font-bold mt-4 mb-2 text-[#9bdd42]">Is this official?</h3>
        <p className="text-[#c9c9c9] mb-4">
          No, People's Chamber is an independent platform for civic engagement, not affiliated with UK Parliament.
        </p>
      </div>
    </div>
  );
}
