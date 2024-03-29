function renderChart(historiesById, idToTitle, milestoneId) {
  const dom = document.getElementById(`chart-${milestoneId}`);
  const myChart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });

  const option = {
    title: {
      text: idToTitle[milestoneId],
      link: `https://github.com/ziglang/zig/milestone/${milestoneId}`
    },
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

  myChart.setOption(option);
  return myChart;
}
