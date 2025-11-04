/** @type {import('next').NextConfig} */
const nextConfig = {
	// output: 'export' // enables a static export
	webpack: (config, { isServer }) => {
		// Suppress warnings about dynamic imports in Supabase packages
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			};
		}
		
		// Suppress critical dependency warnings
		config.module = {
			...config.module,
			exprContextCritical: false,
			unknownContextCritical: false,
		};
		
		return config;
	},
}

module.exports = nextConfig
