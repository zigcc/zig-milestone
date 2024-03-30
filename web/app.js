function renderChart(historiesById, milestoneId) {
  const dom = document.getElementById(`chart-${milestoneId}`);
  const chart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Open', 'Closed']
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
    series: [
      {
        name: 'Open',
        type: 'line',
        stack: 'Total',
        data: historiesById[milestoneId].map((item) => [new Date(item[0]), item[1]])
      },
      {
        name: 'Closed',
        type: 'line',
        stack: 'Total',
        data: historiesById[milestoneId].map((item) => [new Date(item[0]), item[2]])
      },
    ]
  };
  chart.setOption(option);
  return chart;
}
