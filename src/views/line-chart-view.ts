import {
	type App,
	type BasesEntry,
	BasesView,
	Keymap,
	parsePropertyId,
	type HoverPopover,
	type QueryController,
} from "obsidian";
import {
	Chart,
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Title,
	Tooltip,
	Legend,
	Filler,
} from "chart.js";

// Register Chart.js components
Chart.register(
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Title,
	Tooltip,
	Legend,
	Filler
);

export const LineChartViewType = "line-chart-view";

// Predefined colors for multiple lines
const LINE_COLORS = [
	"#8b5cf6", // purple
	"#06b6d4", // cyan
	"#f59e0b", // amber
	"#10b981", // emerald
	"#ef4444", // red
	"#ec4899", // pink
	"#3b82f6", // blue
	"#84cc16", // lime
];

interface DataPoint {
	label: string;
	values: Map<string, number | null>;
	entry: BasesEntry | null;
	linkPath?: string | null;
}

type PropertyId = `note.${string}` | `formula.${string}` | `file.${string}`;

type AggregationMethod = "avg" | "sum" | "min" | "max" | "count";

/**
 * Parse a wiki link string and extract display name and path.
 * Handles formats: [[path|display]], [[path]], or plain text.
 */
function parseWikiLink(text: string): { displayName: string; path: string | null } {
	const wikiLinkMatch = text.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
	if (wikiLinkMatch && wikiLinkMatch[1]) {
		const path = wikiLinkMatch[1];
		const display = wikiLinkMatch[2] ?? path.split("/").pop() ?? path;
		return { displayName: display, path };
	}
	return { displayName: text, path: null };
}

function aggregate(values: number[], method: AggregationMethod): number | null {
	if (values.length === 0) return null;
	switch (method) {
		case "avg":
			return values.reduce((a, b) => a + b, 0) / values.length;
		case "sum":
			return values.reduce((a, b) => a + b, 0);
		case "min":
			return Math.min(...values);
		case "max":
			return Math.max(...values);
		case "count":
			return values.length;
	}
}

export class LineChartBasesView extends BasesView {
	readonly type = LineChartViewType;
	private containerEl: HTMLElement;
	private canvasEl: HTMLCanvasElement | null = null;
	private chart: Chart | null = null;
	private customLabelsEl: HTMLElement | null = null;

	hoverPopover: HoverPopover | null = null;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv("bases-line-chart-view-container");
	}

	public onDataUpdated(): void {
		const { app } = this;

		// Get axis configuration from view options
		const xAxisLabelProperty = this.config.get("xAxisLabelProperty") as string | null;
		const yMinRaw = this.config.get("yMin") as string | null;
		const yMaxRaw = this.config.get("yMax") as string | null;
		const fillArea = Boolean(this.config.get("fillArea"));
		const showPoints = this.config.get("showPoints") !== false;

		// Use the selected properties from the Properties panel as Y-axis values
		// Filter to only include numeric-capable properties (note.* properties)
		const selectedProperties = this.config.getOrder();
		const yAxisProperties = selectedProperties.filter((prop) => {
			// Include note properties (these are user-defined and likely numeric)
			// Exclude file.* properties as they're typically not numeric values for graphing
			return prop.startsWith("note.") || prop.startsWith("formula.");
		});

		// Parse min/max values
		const yMin = yMinRaw ? parseFloat(yMinRaw) : undefined;
		const yMax = yMaxRaw ? parseFloat(yMaxRaw) : undefined;

		// Clear previous content
		this.containerEl.empty();

		// Validate configuration
		if (yAxisProperties.length === 0) {
			this.showMessage("Please configure Y axis properties in the view options.");
			return;
		}

		// Get X-axis label property (default to file.name if not specified)
		const xLabelProp = xAxisLabelProperty || "file.name";

		// Get aggregation method for grouped mode
		const aggregationMethod = (this.config.get("aggregationMethod") as AggregationMethod) || "avg";

		// Detect if data is meaningfully grouped
		const isGrouped = this.data.groupedData.length > 1 ||
			(this.data.groupedData.length === 1 && this.data.groupedData[0]?.hasKey());

		// Extract data points from grouped data
		const dataPoints: DataPoint[] = [];

		if (isGrouped) {
			// Grouped mode: aggregate values per group
			for (const group of this.data.groupedData) {
				const rawLabel = group.key?.toString() ?? "Ungrouped";
				const { displayName, path } = parseWikiLink(rawLabel);

				const values = new Map<string, number | null>();
				for (const yProp of yAxisProperties) {
					const numericValues: number[] = [];
					for (const entry of group.entries) {
						const val = entry.getValue(yProp as PropertyId);
						if (val !== null && val !== undefined) {
							const num = Number(val);
							if (!isNaN(num)) numericValues.push(num);
						}
					}
					values.set(yProp, aggregate(numericValues, aggregationMethod));
				}

				const hasValidValue = Array.from(values.values()).some((v) => v !== null);
				if (hasValidValue) {
					dataPoints.push({ label: displayName, values, entry: null, linkPath: path });
				}
			}
		} else {
			// Non-grouped mode: individual entries
			for (const group of this.data.groupedData) {
				for (const entry of group.entries) {
					// Get the X-axis label value
					const labelValue = entry.getValue(xLabelProp as PropertyId);
					const label = labelValue?.toString() ?? entry.file.name;

					// Get values for each Y-axis property
					const values = new Map<string, number | null>();
					for (const yProp of yAxisProperties) {
						const yValue = entry.getValue(yProp as PropertyId);
						if (yValue !== null && yValue !== undefined) {
							const numericY = Number(yValue);
							values.set(yProp, isNaN(numericY) ? null : numericY);
						} else {
							values.set(yProp, null);
						}
					}

					// Only include entries that have at least one valid Y value
					const hasValidValue = Array.from(values.values()).some((v) => v !== null);
					if (hasValidValue) {
						dataPoints.push({
							label,
							values,
							entry,
						});
					}
				}
			}
		}

		if (dataPoints.length === 0) {
			this.showMessage("No valid data points found. Ensure Y axis properties contain numeric values.");
			return;
		}

		// Sort data points by label (try numeric first, then alphabetic)
		dataPoints.sort((a, b) => {
			const aNum = Number(a.label);
			const bNum = Number(b.label);
			if (!isNaN(aNum) && !isNaN(bNum)) {
				return aNum - bNum;
			}
			return String(a.label).localeCompare(String(b.label));
		});

		// Check if we have any clickable links in the data points
		const hasLinks = dataPoints.some((dp) => dp.linkPath || dp.entry);

		// Create chart wrapper for proper layout
		const chartWrapper = this.containerEl.createDiv("bases-line-chart-wrapper");

		// Create canvas element using containerEl.doc for pop-out window support
		this.canvasEl = this.containerEl.doc.createElement("canvas");
		this.canvasEl.addClass("bases-line-chart-canvas");
		chartWrapper.appendChild(this.canvasEl);

		// Create custom labels container if we have links
		if (hasLinks) {
			this.customLabelsEl = this.containerEl.createDiv("bases-line-chart-custom-labels");
		}

		// Destroy existing chart before creating new one
		this.destroyChart();

		// Create Chart.js line chart
		const ctx = this.canvasEl.getContext("2d");
		if (!ctx) {
			this.showMessage("Failed to create canvas context.");
			return;
		}

		// Get computed styles for theme-aware colors
		const computedStyle = getComputedStyle(this.containerEl);
		const textColor = computedStyle.getPropertyValue("--text-normal").trim() || "#666";
		const gridColor = computedStyle.getPropertyValue("--background-modifier-border").trim() || "#e0e0e0";

		// Create datasets for each Y-axis property
		const datasets = yAxisProperties.map((yProp, index) => {
			const color = LINE_COLORS[index % LINE_COLORS.length];
			// Get the display name (renamed value) or fall back to the property name
			const displayName = this.getPropertyDisplayName(yProp);

			return {
				label: displayName,
				data: dataPoints.map((dp) => dp.values.get(yProp) ?? null),
				borderColor: color,
				backgroundColor: fillArea ? `${color}33` : "transparent",
				fill: fillArea,
				pointRadius: showPoints ? 4 : 0,
				pointHoverRadius: showPoints ? 6 : 4,
				pointBackgroundColor: color,
				pointBorderColor: color,
				tension: 0.1,
				spanGaps: true, // Connect lines even when there are null values
			};
		});

		this.chart = new Chart(ctx, {
			type: "line",
			data: {
				labels: dataPoints.map((dp) => dp.label),
				datasets,
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				// Disable animation for immediate rendering
				animation: false,
				onResize: () => {
					// Re-render labels when chart resizes
					if (hasLinks && this.chart && this.customLabelsEl) {
						this.renderCustomLabels(dataPoints, app);
					}
				},
				interaction: {
					mode: "index",
					intersect: false,
				},
				plugins: {
					legend: {
						display: true,
						position: "top",
						labels: {
							color: textColor,
							usePointStyle: true,
						},
					},
					tooltip: {
						enabled: true,
						mode: "index",
						intersect: false,
					},
				},
				scales: {
					x: {
						title: {
							display: true,
							text: isGrouped ? "Group" : this.getPropertyDisplayName(xLabelProp),
							color: textColor,
						},
						ticks: {
							display: !hasLinks, // Hide ticks when we render custom HTML labels
							color: textColor,
							maxRotation: 45,
							minRotation: 0,
						},
						grid: {
							color: gridColor,
						},
					},
					y: {
						title: {
							display: true,
							text: yAxisProperties.length === 1 && yAxisProperties[0]
								? this.getPropertyDisplayName(yAxisProperties[0])
								: "Value",
							color: textColor,
						},
						min: isNaN(yMin as number) ? undefined : yMin,
						max: isNaN(yMax as number) ? undefined : yMax,
						ticks: {
							color: textColor,
						},
						grid: {
							color: gridColor,
						},
					},
				},
				onClick: (_event, elements) => {
					if (elements.length > 0) {
						const element = elements[0];
						if (element) {
							const index = element.index;
							const dataPoint = dataPoints[index];
							if (dataPoint?.entry) {
								// Individual entry mode: navigate to the file
								const path = dataPoint.entry.file.path;
								void app.workspace.openLinkText(path, "", Keymap.isModEvent(_event.native as MouseEvent));
							} else if (dataPoint?.linkPath) {
								// Grouped mode with link: navigate to the linked file
								void app.workspace.openLinkText(dataPoint.linkPath, "", Keymap.isModEvent(_event.native as MouseEvent));
							}
						}
					}
				},
			},
		});

		// Render custom labels immediately after chart creation
		if (hasLinks && this.customLabelsEl) {
			this.renderCustomLabels(dataPoints, app);
		}
	}

	private renderCustomLabels(dataPoints: DataPoint[], app: App): void {
		if (!this.chart || !this.customLabelsEl || !this.canvasEl) return;

		// Clear existing labels
		this.customLabelsEl.empty();

		const xScale = this.chart.scales["x"];
		if (!xScale) return;

		// Get canvas position relative to the container
		const canvasRect = this.canvasEl.getBoundingClientRect();
		const containerRect = this.containerEl.getBoundingClientRect();
		const canvasOffsetLeft = canvasRect.left - containerRect.left;

		// Create labels for each data point
		dataPoints.forEach((dp, index) => {
			const xPos = xScale.getPixelForValue(index);

			const labelEl = this.customLabelsEl!.createDiv("bases-line-chart-label");
			// Position relative to container, accounting for canvas offset
			labelEl.style.left = `${canvasOffsetLeft + xPos}px`;

			// Determine if this is a clickable link
			const linkPath = dp.linkPath ?? dp.entry?.file?.path;

			if (linkPath) {
				// Create as internal link
				const linkEl = labelEl.createEl("a", {
					cls: "internal-link",
					text: dp.label,
				});
				linkEl.dataset.href = linkPath;

				linkEl.addEventListener("click", (evt) => {
					evt.preventDefault();
					void app.workspace.openLinkText(linkPath, "", Keymap.isModEvent(evt));
				});

				linkEl.addEventListener("auxclick", (evt) => {
					if (evt.button === 1) {
						evt.preventDefault();
						void app.workspace.openLinkText(linkPath, "", true);
					}
				});

				// Add hover preview support
				linkEl.addEventListener("mouseover", (evt) => {
					app.workspace.trigger("hover-link", {
						event: evt,
						source: "bases",
						hoverParent: this,
						targetEl: linkEl,
						linktext: linkPath,
					});
				});
			} else {
				// Plain text label
				labelEl.createSpan({ text: dp.label });
			}
		});
	}

	private getPropertyDisplayName(propertyId: string): string {
		try {
			// Try to get the renamed display name from the config
			const displayName = this.config.getDisplayName(propertyId as PropertyId);
			if (displayName) {
				return displayName;
			}
			// Fall back to the parsed property name
			const { name } = parsePropertyId(propertyId as PropertyId);
			return name;
		} catch {
			return propertyId;
		}
	}

	private showMessage(message: string): void {
		const messageEl = this.containerEl.createDiv("bases-line-chart-message");
		messageEl.setText(message);
	}

	private destroyChart(): void {
		if (this.chart) {
			this.chart.destroy();
			this.chart = null;
		}
	}

	public onunload(): void {
		this.destroyChart();
	}
}
