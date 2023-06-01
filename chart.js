function makeChart() {
	const opts = {
		title: "Contador",
		width: 800,
		height: 400,
		cursor: {
			drag: {
				setScale: false,
			}
		},
		select: {
			show: false,
		},
		series: [
			{},
			{
				label: "Display A",
				scale: "",
				value: (u, v) => v == null ? null : v + "",
				stroke: "red",
			},
			// {
			// 	label: "Display B",
			// 	scale: "",
			// 	value: (u, v) => v == null ? null : v + "",
			// 	stroke: "green",
			// }
		],
		axes: [
			{},
			{
				scale: '',
				values: (u, vals, space) => vals.map(v => + v + ""),
			},
			// {
			// 	side: 1,
			// 	scale: '',
			// 	values: (u, vals, space) => vals.map(v => + v + ""),
			// 	grid: {show: false},
			// },
		],
	};

	let data = [[],[],[]];
	let chart = new uPlot(opts, data, document.getElementById('chartCanvas'));
	chart.setData(data)
	return chart
}

let chart = makeChart()

