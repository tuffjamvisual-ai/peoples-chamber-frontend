export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">About People's Chamber</h1>
          <p className="text-gray-600">
            Bridging the gap between citizens and Parliament
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 space-y-6">
          
          {/* What is People's Chamber */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">What is People's Chamber?</h2>
            <p className="text-gray-700 leading-relaxed">
              People's Chamber is a platform that allows UK citizens to vote on Parliamentary bills 
              and compare their votes with how MPs actually voted. Our mission is to highlight the 
              gap between public opinion and Parliamentary decisions, fostering greater transparency 
              and engagement in the democratic process.
            </p>
          </section>

          {/* How It Works */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">How It Works</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">1. Browse Bills</h3>
                <p className="text-gray-700">
                  View all current and historical Parliamentary bills with complete information 
                  including sponsors, stages, and descriptions.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">2. Cast Your Vote</h3>
                <p className="text-gray-700">
                  Support, oppose, or abstain on any bill. Your vote is recorded and contributes 
                  to the public opinion tally.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">3. Compare with MPs</h3>
                <p className="text-gray-700">
                  See how your vote compares with how MPs voted in the House of Commons. 
                  Discover where public opinion aligns with or diverges from Parliament.
                </p>
              </div>
            </div>
          </section>

          {/* The Data */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">The Data</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>3,865 Parliamentary bills</strong> with complete information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>650 current MPs</strong> with photos and constituencies</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>236 bills with House of Commons voting data</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>All data sourced from official UK Parliament APIs</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Why This Matters */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Why This Matters</h2>
            <p className="text-gray-700 leading-relaxed">
              Democracy works best when citizens are informed and engaged. People's Chamber provides 
              a clear window into how representative our representatives truly are. By voting on the 
              same bills that MPs consider, you can see firsthand whether your views align with your 
              elected officials—and hold them accountable.
            </p>
          </section>

          {/* Technology */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Technology</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              People's Chamber is built with modern web technologies to ensure fast, reliable performance:
            </p>
            <ul className="space-y-1 text-gray-700 ml-4">
              <li>• Next.js 16 with TypeScript</li>
              <li>• Supabase PostgreSQL database</li>
              <li>• Hosted on Vercel for instant global deployment</li>
              <li>• UK Parliament API integration</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Get In Touch</h2>
            <p className="text-gray-700">
              Have questions, suggestions, or feedback? We'd love to hear from you.
            </p>
            <p className="text-gray-600 mt-2 text-sm">
              This is an independent project aimed at increasing political transparency and engagement.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
