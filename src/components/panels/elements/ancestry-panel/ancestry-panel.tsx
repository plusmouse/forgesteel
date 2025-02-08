import { Ancestry } from '../../../../models/ancestry';
import { FeaturePanel } from '../feature-panel/feature-panel';
import { HeaderText } from '../../../controls/header-text/header-text';
import { Hero } from '../../../../models/hero';
import { Markdown } from '../../../controls/markdown/markdown';
import { PanelMode } from '../../../../enums/panel-mode';
import { Sourcebook } from '../../../../models/sourcebook';

import './ancestry-panel.scss';

interface Props {
	ancestry: Ancestry;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
	mode?: PanelMode;
}

export const AncestryPanel = (props: Props) => {
	try {
		return (
			<div className={props.mode === PanelMode.Full ? 'ancestry-panel' : 'ancestry-panel compact'} id={props.mode === PanelMode.Full ? props.ancestry.id : undefined}>
				<HeaderText level={1}>{props.ancestry.name || 'Unnamed Ancestry'}</HeaderText>
				<Markdown text={props.ancestry.description} />
				{
					props.mode === PanelMode.Full ?
						props.ancestry.features.map(f => <FeaturePanel key={f.id} feature={f} hero={props.hero} sourcebooks={props.sourcebooks} mode={PanelMode.Full} />)
						:
						null
				}
			</div>
		);
	} catch (ex) {
		console.error(ex);
		return null;
	}
};
