/** Base Next.js config */
const baseConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },
    // Exclude Puppeteer/Chromium from bundling - load at runtime only
    serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "@sparticuz/chromium-min"],

    experimental: {
        webpackBuildWorker: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
    },
    env: {
        JWT_SECRET: process.env.JWT_SECRET,
    },
};

async function getNextConfig() {
    let userConfig = {};
    try {
        // Dynamically import the user configuration file if it exists.
        const imported = await import("./v0-user-next.config");
        userConfig = imported.default || imported;
    } catch (e) {
        // If the file doesn't exist, ignore the error.
    }

    // Add webpack config to baseConfig
    baseConfig.webpack = (config, { isServer }) => {
        if (isServer) {
            // Exclude @sparticuz/chromium from webpack bundle (it's loaded at runtime)
            config.externals = config.externals || [];
            if (Array.isArray(config.externals)) {
                config.externals.push({
                    '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
                    '@sparticuz/chromium-min': 'commonjs @sparticuz/chromium-min',
                    'puppeteer': 'commonjs puppeteer',
                    'puppeteer-core': 'commonjs puppeteer-core',
                });
            } else {
                config.externals = [
                    config.externals,
                    {
                        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
                        '@sparticuz/chromium-min': 'commonjs @sparticuz/chromium-min',
                        'puppeteer': 'commonjs puppeteer',
                        'puppeteer-core': 'commonjs puppeteer-core',
                    },
                ];
            }
        }
        return config;
    };

    // Merge userConfig values into baseConfig.
    for (const key in userConfig) {
        if (typeof baseConfig[key] === "object" && !Array.isArray(baseConfig[key]) && key !== "webpack") {
            baseConfig[key] = {
                ...baseConfig[key],
                ...userConfig[key],
            };
        } else if (key === "webpack") {
            // Merge webpack configs
            const baseWebpack = baseConfig.webpack;
            const userWebpack = userConfig.webpack;
            baseConfig.webpack = (config, options) => {
                let result = baseWebpack ? baseWebpack(config, options) : config;
                return userWebpack ? userWebpack(result, options) : result;
            };
        } else {
            baseConfig[key] = userConfig[key];
        }
    }

    return baseConfig;
}

// Export the configuration using ES module syntax.
// Next.js accepts a promise that resolves to a config object.
export default getNextConfig();
