import {App, PluginSettingTab, Setting} from "obsidian";
import GraphsViewPlugin from "./main";

export interface GraphsViewSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: GraphsViewSettings = {
	mySetting: 'default'
}

export class GraphsViewSettingTab extends PluginSettingTab {
	plugin: GraphsViewPlugin;

	constructor(app: App, plugin: GraphsViewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
