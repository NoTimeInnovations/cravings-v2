export default function CaseStudies() {
  return (
    <section className="py-20 bg-white sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto border-r border-l border-t border-stone-200">
      <div className="max-w-5xl mx-auto px-6 md:px-16">
        <h2 className="font-geist font-medium text-3xl md:text-4xl text-stone-900 leading-tight mb-12">
          Real restaurants,{" "}
          <span className="text-stone-500">real results.</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Stats */}
          <div className="flex flex-col justify-center">
            <p className="text-sm text-stone-500 uppercase tracking-wider mb-8">
              Last 30 days order results
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-3xl font-semibold text-stone-900">492+</p>
                <p className="text-sm text-stone-500 mt-1">Orders Received</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-stone-900">~17</p>
                <p className="text-sm text-stone-500 mt-1">
                  Avg Orders / Day
                </p>
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

          {/* Quote */}
          <div className="flex items-center">
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100">
              <svg
                className="w-8 h-8 text-orange-600/30 mb-4"
                fill="currentColor"
                viewBox="0 0 32 32"
              >
                <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z" />
              </svg>
              <p className="text-base text-stone-700 leading-relaxed italic">
                &ldquo;We went from zero online orders to hundreds in just two
                months. The Petpooja integration means every order hits our
                kitchen instantly. No manual entry, no missed orders.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
