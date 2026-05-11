export default function NewspaperDemo() {
  return (
    <>
      {/* Current full-width dark design */}
      <div className="min-h-screen bg-[#1a1a1a] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Current Design (Full Width Dark)</h1>
          <p className="text-gray-300 mb-4">
            Background color spans entire screen width. No visual boundary between content and viewport edges.
          </p>
          <div className="bg-gray-800 p-6 rounded">
            <p>Sample content block</p>
          </div>
        </div>
      </div>

      {/* Proposed newspaper-on-table design */}
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-7xl mx-auto bg-[#1a1a1a] border border-gray-800/30 shadow-2xl">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Proposed Design (Newspaper on Table)</h1>
            <p className="text-gray-300 mb-4">
              Content constrained with visible boundary. Darker gutter (#0a0a0a) creates &quot;table&quot; effect.
              Content area (#1a1a1a) sits on top like a newspaper page with subtle border and shadow.
            </p>
            <div className="bg-gray-800 p-6 rounded">
              <p>Sample content block</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
