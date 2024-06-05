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
    type: 'value',
    scale: true,
  },
  dataZoom: [{
    start: 0,
    end: 100
 }]
};

function addLegendClick(chart) {
  chart.on('legendselectchanged', function (params) {
    const currentClicked = params.name;
    for(const item of Object.keys(params.selected)) {
      if (currentClicked !== item) {
        chart.dispatchAction({type: 'legendUnSelect', name: item});
      }
    }
    chart.dispatchAction({type: 'legendSelect', name: currentClicked});
  });
}

function renderMilestoneChart(historiesById, milestoneId) {
  const dom = document.getElementById(`chart-${milestoneId}`);
  const chart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });
  var opt = {...commonChartOpts};
  let selected = { 'Closed': false };
  if(milestoneId === 20) {
    // 0.13.0 dev just begins, so display close issue by default
    selected = { 'Open': false };
  }

  opt['legend'] = {
    selected: selected,
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
  addLegendClick(chart);
  return chart;
}


function renderRepoChart(repoHistories, repoField, fieldIdx) {
  const dom = document.getElementById(`repo-${repoField}`);
  const chart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });
  var opt = {...commonChartOpts};
  opt['legend'] = {
    data: [repoField],
  };
  opt['series'] = [{
    name: repoField,
    type: 'line',
    stack: 'Total',
    data: repoHistories.map((item) => [item[0], item[fieldIdx]])
 }];

  chart.setOption(opt);
  addLegendClick(chart);
  return chart;
}
