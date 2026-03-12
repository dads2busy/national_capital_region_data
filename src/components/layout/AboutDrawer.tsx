'use client'

interface AboutDrawerProps {
  open: boolean
  onClose: () => void
}

export function AboutDrawer({ open, onClose }: AboutDrawerProps) {
  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${open ? 'bg-black/30 backdrop-blur-sm' : 'pointer-events-none bg-black/0'}`}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative z-10 flex h-full w-80 flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-gray-900 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>About</h5>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          <p className="mb-3">
            This site was made by the{' '}
            <a
              href="https://biocomplexity.virginia.edu/institute/divisions/social-and-decision-analytics"
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Social and Decision Analytics Division
            </a>{' '}
            of the{' '}
            <a
              href="https://biocomplexity.virginia.edu"
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Biocomplexity Institute
            </a>{' '}
            for the{' '}
            <a
              href="https://www.vdh.virginia.gov"
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Virginia Department of Health
            </a>
            .
          </p>
          <p className="mb-4">
            View its source on{' '}
            <a
              href="https://github.com/uva-bi-sdad/vdh_rural_health_site"
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>

          <h5 className="mb-2 font-semibold">Credits</h5>
          <p className="text-gray-600 dark:text-gray-400">
            Built with Next.js, React, TypeScript, Leaflet, Plotly.js, and Tailwind CSS. Data from the Virginia
            Department of Health Social Data Commons.
          </p>
        </div>
      </div>
    </div>
  )
}
