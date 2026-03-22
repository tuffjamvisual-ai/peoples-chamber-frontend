import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 3600 // Revalidate every hour

export default async function LawsPage() {
  // Fetch bills that have reached Royal Assent (became laws)
  const { data: laws, error } = await supabase
    .from('bill')
    .select('*')
    .eq('current_stage', 'Royal Assent')
    .order('stage_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching laws:', error)
    return <div className="p-8">Error loading laws</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Laws</h1>
          <p className="text-gray-600">
            Bills that have received Royal Assent and become law
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {laws?.length || 0} laws found
          </p>
        </div>
      </div>

      {/* Laws Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!laws || laws.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No laws found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {laws.map((law) => (
              <Link
                key={law.id}
                href={`/bills/${law.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200"
              >
                {/* Law Title */}
                <h3 className="font-semibold text-lg text-gray-900 mb-3 line-clamp-2">
                  {law.title}
                </h3>

                {/* Category Badge */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {law.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {law.description}
                </p>

                {/* Royal Assent Date */}
                {law.stage_date && (
                  <p className="text-xs text-gray-500">
                    Royal Assent: {new Date(law.stage_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}

                {/* Sponsor */}
                {law.sponsor_name && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    {law.sponsor_photo && (
                      <img
                        src={law.sponsor_photo}
                        alt={law.sponsor_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {law.sponsor_name}
                      </p>
                      {law.sponsor_party && (
                        <p className="text-xs text-gray-500">
                          {law.sponsor_party}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
