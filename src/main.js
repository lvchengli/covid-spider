import fs from 'fs';
import axios from 'axios';
import { load } from 'cheerio';
import htmlstr from './htmlstr.js';
import infectStr from './infectStr.js';

function getGithubContent() {
  axios.get('https://github.com/weiyinfu?tab=repositories').then((resp) => {
    var $ = load(resp.data);
    var lis = $('#user-repositories-list li');
    var repos = [];
    for (var i = 0; i < lis.length; i++) {
      var li = lis.eq(i);
      var repo = {
        repoName: li.find('h3').text().trim(),
        repoUrl: li.find('h3 a').attr('href').trim(),
        repoDesc: li.find('p').text().trim(),
        language: li.find('[itemprop=programmingLanguage]').text().trim(),
        star: li.find('.muted-link.mr-3').eq(0).text().trim(),
        fork: li.find('.muted-link.mr-3').eq(1).text().trim(),
        forkedFrom: li.find('.f6.text-gray.mb-1 a').text().trim()
      };
      repos.push(repo);
    }
    console.log(repos);
  });
}
async function getUrlContent(url) {
  const resp = await axios.get(url);
  return resp.data;
}

function calcContent(content) {
  var $ = load(content);
  var liDomList = $('.container .list-date li');
  var list = [];
  for (var i = 0; i < liDomList.length; i++) {
    const item = liDomList.eq(i);
    const anchorNode = item.find('a');
    const timeNode = item.find('.time');
    list.push({
      href: anchorNode.attr('href'),
      title: anchorNode.attr('title'),
      time: timeNode.text().trim()
    });
  }
  console.log(list);
}

// 参考代码，目前已废弃
// getGithubContent()

// step1 获取卫健委网页信息，提取url数组
// const yqtbUrl = 'https://wsjkw.sh.gov.cn/yqtb/index.html'
// const content = await getUrlContent(yqtbUrl)
// const content = htmlstr
// calcContent(content)

// step2 分析出需要提取迭代哪些数据

// step3 获取居住地信息 获取感染情况分布
// const host = 'https://wsjkw.sh.gov.cn'
// const infectUrl = host + '/xwfb/20220426/d4d847dcf3f64fcab102cf5a65656891.html'
// const infectContent = await getUrlContent(infectUrl)
// console.log(infectContent)
function calcInfectUrl(content) {
  var $ = load(content);
  var liDomList = $('#ivs_content>p');
  // 1. 按照 p标签切分为数组
  // 2. 提取str关键字，如果是风险人群，保留，其他跳过
  // 关键字 '在风险人群筛查中发现新冠病毒核酸检测结果异常' '诊断为确诊病例' '诊断为无症状感染者'
  // 3. 处理提取后的人员信息
  //
  var riskPeople = {
    patient: {
      str: '',
      info: {
        // {location: num}
        // 'xx区': '多少个'
      },
      total: 0
    },
    silent: {
      str: '',
      info: {},
      total: 0
    },
    total: {
      info: {},
      total: 0
    }
  };
  var riskPattern = '在风险人群筛查中发现新冠病毒核酸检测结果异常';
  var patientPattern = '诊断为确诊病例';
  var silentPattern = '诊断为无症状感染者';
  for (var i = 0; i < liDomList.length; i++) {
    let str = liDomList.eq(i).text().trim();
    console.log('str', str);
    let riskPatternIndex = str.indexOf(riskPattern);
    console.log('riskPatternIndex', riskPatternIndex);

    if (riskPatternIndex !== -1) {
      if (str.indexOf(patientPattern) !== -1) {
        str = str.slice(0, riskPatternIndex);
        riskPeople.patient.str = str;
        console.log('riskPeople.patient.str', riskPeople.patient.str);
        var list = str.split('居住于');
        for (var i = 1; i < list.length; i++) {
          var key = list[i].slice(0, list[i].indexOf('区') + 1);
          var value = getValue(list[i - 1]);
          riskPeople.patient.info[key] = value;
          riskPeople.total.info[key] = (riskPeople.total.info[key] || 0) + value;
          riskPeople.patient.total += value;
          riskPeople.total.total += value;
        }
        console.log(riskPeople.patient);
      } else if (str.indexOf(silentPattern) !== -1) {
        str = str.slice(0, riskPatternIndex);
        riskPeople.silent.str = str;
        var list = str.split('居住于');
        for (var i = 1; i < list.length; i++) {
          var key = list[i].slice(0, list[i].indexOf('区') + 1);
          var value = getValue(list[i - 1]);
          riskPeople.silent.info[key] = value;
          riskPeople.total.info[key] = (riskPeople.total.info[key] || 0) + value;
          riskPeople.silent.total += value;
          riskPeople.total.total += value;
        }
      }
    }
  }

  console.log(riskPeople);
  return riskPeople;
}

function getValue(str) {
  var arr = str.match(/\d+(.\d+)?/g);
  console.log(arr, str);
  if (arr.length > 1) {
    return arr[arr.length - 1] - arr[0] + 1;
  } else {
    return 1;
  }
}
const obj = calcInfectUrl(infectStr);

fs.writeFile('./jsonFile/test.json', JSON.stringify(obj), (err) => {
  if (err) {
    console.error(err);
    return;
  }
  //file written successfully
});

// const locationUrl = 'https://mp.weixin.qq.com/s/SIuDbITNdgWwYyM3eiyrgg'
// const locationContent = await getUrlContent(locationUrl)
// console.log(locationContent)

// step4 整理出图表绘制出来
