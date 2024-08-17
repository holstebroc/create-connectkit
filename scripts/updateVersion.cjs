/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const packagesPath = path.join(__dirname, '../examples');

const getDirectories = (source) =>
  fs.readdirSync(source).filter((file) =>
    fs.statSync(path.join(source, file)).isDirectory()
  );

const loadPkgData = async (page) => {
  try {
    const response = await axios.get('https://www.npmjs.com/search', {
      params: {
        q: '@particle-network',
        perPage: 20,
        page,
        timestamp: Date.now(),
      },
      headers: {
        authority: 'www.npmjs.com',
        accept: '*/*',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        referer: 'https://www.npmjs.com/search?q=%40particle-network',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': 'macOS',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'none',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
        'x-requested-with': 'XMLHttpRequest',
        'x-spiferack': '1',
      },
    });

    const result = response.data.objects.map((item) => ({
      name: item.package.name,
      version: item.package.version,
    }));

    return {
      total: response.data.total,
      result,
    };
  } catch (error) {
    console.error(`Failed to load package data for page ${page}:`, error);
    throw error;
  }
};

(async () => {
  console.log('--START--');

  const packages = getDirectories(packagesPath);
  const newVersions = [];
  
  try {
    const initialResponse = await loadPkgData(0);
    newVersions.push(...initialResponse.result);

    if (initialResponse.total > 20) {
      const pages = Math.ceil(initialResponse.total / 20);
      for (let i = 1; i < pages; i++) {
        const pageResponse = await loadPkgData(i);
        newVersions.push(...pageResponse.result);
      }
    }

    packages.forEach((pkg) => {
      const srcPath = path.join(packagesPath, pkg, 'package.json');
      if (fs.existsSync(srcPath)) {
        let packageContent = fs.readFileSync(srcPath, 'utf8');
        
        newVersions.forEach(({ name, version }) => {
          const reg = new RegExp(`"${name}": ".*"`, 'g');
          packageContent = packageContent.replace(reg, (substring) => {
            const replacement = `"${name}": "^${version}"`;
            console.log(`${pkg}: ${substring} -> ${replacement}`);
            return replacement;
          });
        });

        fs.writeFileSync(srcPath, packageContent, 'utf8');
      } else {
        console.warn(`File not found: ${srcPath}`);
      }
    });
  } catch (error) {
    console.error('Error occurred:', error);
  }

  console.log('--END--');
})();
