const commonChartOpts = {
  tooltip: {
    trigger: 'axis'
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  toolbox: {
    show : true,
    feature: {
      mark : {show: true},
      dataView : {show: true, readOnly: false},
      magicType : {show: true, type: ['line', 'bar']},
      restore : {show: true},
      saveAsImage : {show: true}
    }
  },
  xAxis: {
    type: 'time',
    boundaryGap: false,
  },
  yAxis: {
    type: 'value'
  },
  dataZoom: [{
    start: 0,
    end: 100
 }]
};

function renderMilestoneChart(historiesById, milestoneId) {
  const dom = document.getElementById(`chart-${milestoneId}`);
  const chart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });
  var opt = {...commonChartOpts};
  opt['legend'] = {
    data: ['Open', 'Closed']
  };
  opt['series'] = [
    {
      name: 'Open',
      type: 'line',
      stack: 'Total',
      data: historiesById[milestoneId].map((item) => [item[0], item[1]])
    },
    {
      name: 'Closed',
      type: 'line',
      stack: 'Total',
      data: historiesById[milestoneId].map((item) => [item[0], item[2]])
    },
  ];

  chart.setOption(opt);
  return chart;
}


function renderRepoChart(repoHistories, repoId) {
  const dom = document.getElementById(`${repoId}`);
  const chart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });
  const columns = [
    'forks',
    'stars',
    'watchers',
    'open_pulls',
    'closed_pulls',
    'merged_pulls',
    'open_issues',
    'closed_issues',
  ];
  var opt = {...commonChartOpts};
  const series = columns.map((col, colIdx) => {
    let series = {name: col, type: 'line', stack: 'Total', data:[] };
    for(const row of repoHistories) {
      // first col is ts, shift by one.
      series['data'].push([row[0], row[colIdx+1]]);
    }

    return series;
  });
  opt['legend'] = { data: columns };
  opt['toolbox'] = {};
  opt['series'] = series;
  console.log(opt);

  chart.setOption(opt);
  return chart;
}
