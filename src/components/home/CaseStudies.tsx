export default function CaseStudies() {
  return (
    <section className="py-20 bg-white sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto border-r border-l border-t border-stone-200">
      <div className="max-w-5xl mx-auto px-6 md:px-16">
        <h2 className="font-geist font-medium text-3xl md:text-4xl text-stone-900 leading-tight mb-12">
          Real restaurants,{" "}
          <span className="text-stone-500">real results.</span>
        </h2>

        <p className="text-sm text-stone-500 uppercase tracking-wider mb-8">
            Last 30 days order results
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-3xl font-semibold text-stone-900">492+</p>
              <p className="text-sm text-stone-500 mt-1">Orders Received</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-stone-900">~17</p>
              <p className="text-sm text-stone-500 mt-1">Avg Orders / Day</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-stone-900">₹98K+</p>
              <p className="text-sm text-stone-500 mt-1">Revenue Generated</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-stone-900">₹201</p>
              <p className="text-sm text-stone-500 mt-1">Avg Order Value</p>
            </div>
          </div>
      </div>
    </section>
  );
}
