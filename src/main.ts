import { Plugin } from "obsidian";
import { LineChartBasesView, LineChartViewType } from "./views/line-chart-view";

export default class GraphsViewPlugin extends Plugin {
	async onload() {
		// Register the line chart view for displaying data as line charts
		// Y-axis properties are determined by the selected properties in the Properties panel
		this.registerBasesView(LineChartViewType, {
			name: "Line Chart",
			icon: "lucide-line-chart",
			factory: (controller, containerEl) =>
				new LineChartBasesView(controller, containerEl),
			options: () => [
				{
					type: "property",
					key: "xAxisLabelProperty",
					displayName: "X axis label property",
					description:
						"Property to use for X axis labels (e.g., file.name, note.date)",
				},
				{
					type: "text",
					key: "yMin",
					displayName: "Y axis minimum",
					description: "Optional minimum value for Y axis",
					default: "",
				},
				{
					type: "text",
					key: "yMax",
					displayName: "Y axis maximum",
					description: "Optional maximum value for Y axis",
					default: "",
				},
				{
					type: "toggle",
					key: "fillArea",
					displayName: "Fill area under line",
					default: false,
				},
				{
					type: "toggle",
					key: "showPoints",
					displayName: "Show data points",
					default: true,
				},
				{
					type: "dropdown",
					key: "aggregationMethod",
					displayName: "Aggregation method",
					description: "How to aggregate values when data is grouped",
					default: "avg",
					options: {
						avg: "Average",
						sum: "Sum",
						min: "Minimum",
						max: "Maximum",
						count: "Count",
					},
				},
			],
		});
	}
}
