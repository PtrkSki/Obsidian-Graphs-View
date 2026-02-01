import {App, Plugin, PluginSettingTab, Setting} from "obsidian";

export interface GraphsViewSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: GraphsViewSettings = {
	mySetting: 'default'
}

interface PluginWithSettings extends Plugin {
	settings: GraphsViewSettings;
	saveSettings(): Promise<void>;
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: PluginWithSettings;

	constructor(app: App, plugin: PluginWithSettings) {
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
