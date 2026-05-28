const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/company/CompanyClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace mock company values
content = content.replace(/'株式会社ロング'/g, "'\\u682a\\u5f0f\\u4f1a\\u793a\\u30ed\\u30f3\\u30b0'");
content = content.replace(/'カブシキガイシャロング'/g, "'\\u30ab\\u30d6\\u30b7\u30ad\\u30ac\\u30a4\\u30b7\\u30e3\\u30ed\\u30f3\\u30b0'");
content = content.replace(/'ロン グエン'/g, "'\\u30ed\\u30f3\\u0020\\u30b0\\u30a8\\u30f3'");
content = content.replace(/'代表取締役'/g, "'\\u4ee3\\u8868\\u53d6\\u7de5\\u5f79'");
content = content.replace(/'10,000,000円'/g, "'10,000,000\\u5186'");
content = content.replace(/'14名'/g, "'14\\u540d'");
content = content.replace(/'IT・ソフトウェア'/g, "'\\u0049\\u0054\\u30fb\\u30bd\\u30d5\\u30c8\\u30a6\\u30a7\\u30a2'");
content = content.replace(/'〒100-0001 東京都千代田区千代田1-1-1 ロングビル3F'/g, "'\\u3012100-0001\\u0020\\u6771\\u4eac\\u90fd\\u5343\\u4ee3\\u7530\\u533a\\u5343\\u4ee3\\u75301-1-1\\u0020\\u30ed\\u30f3\\u30b0\\u30d3\\u30eb3F'");
content = content.replace(/'三菱UFJ銀行'/g, "'\\u4e09\\u83f1\\u0055\\u0046\\u004a\\u9280\\u884c'");
content = content.replace(/'東京支店'/g, "'\\u6771\\u4eac\\u652f\\u5e97'");
content = content.replace(/'普通'/g, "'\\u666e\\u901a'");
content = content.replace(/'当座'/g, "'\\u5f53\\u5ea7'");
content = content.replace(/'末日'/g, "'\\u672b\\u65e5'");

// Replace Zh detection and translations
content = content.replace(/'取消'/g, "'\\u53d6\\u6d88'");
content = content.replace(/'普通存款'/g, "'\\u666e\\u901a\\u5b58\\u6b3e'");
content = content.replace(/'支票存款'/g, "'\\u652f\\u7968\\u5b58\\u6b3e'");
content = content.replace(/'IT与软件'/g, "'\\u0049\\u0054\\u4e0e\\u8f6f\\u4ef6'");
content = content.replace(/'代表董事'/g, "'\\u4ee3\\u8868\\u8463\\u4e8b'");

// Replace JSX value attributes
content = content.replace(/"末日"/g, '"\\u672b\\u65e5"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully escaped CompanyClient.tsx!');
