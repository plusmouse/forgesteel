import { Segmented, Space } from 'antd';
import { Collections } from '../../../utils/collections';
import { Empty } from '../../controls/empty/empty';
import { Field } from '../../controls/field/field';
import { HeaderText } from '../../controls/header-text/header-text';
import { Hero } from '../../../models/hero';
import { HeroPanel } from '../../panels/hero/hero-panel';
import { Modal } from '../modal/modal';
import { Options } from '../../../models/options';
import { SelectablePanel } from '../../controls/selectable-panel/selectable-panel';
import { Sourcebook } from '../../../models/sourcebook';
import { useState } from 'react';

import './hero-select-modal.scss';

interface Props {
	heroes: Hero[];
	sourcebooks: Sourcebook[];
	options: Options;
	onClose: () => void;
	onSelect: (heroes: Hero[]) => void;
}

export const HeroSelectModal = (props: Props) => {
	const [ mode, setMode ] = useState<string>('party');

	try {
		const getContent = () => {
			switch (mode) {
				case 'party': {
					const folders = Collections.distinct(props.heroes.map(h => h.folder), f => f).sort().filter(f => !!f);

					if (folders.length === 0) {
						return (
							<Empty />
						);
					}

					return folders.map(f => (
						<SelectablePanel
							key={f}
							onSelect={() => props.onSelect(props.heroes.filter(h => h.folder === f))}
						>
							<HeaderText level={1}>{f}</HeaderText>
							{
								props.heroes
									.filter(h => h.folder === f)
									.sort()
									.map(h => <Field label={h.name} value={`Level ${h.class?.level} ${h.ancestry?.name} ${h.class?.name}`} />)
							}
						</SelectablePanel>
					));
				}
				case 'hero': {
					const heroes = props.heroes;

					if (heroes.length === 0) {
						return (
							<Empty />
						);
					}

					return heroes.map(h => (
						<SelectablePanel
							key={h.id}
							onSelect={() => {
								props.onSelect([ h ]);
							}}
						>
							<HeroPanel hero={h} sourcebooks={props.sourcebooks} options={props.options} />
						</SelectablePanel>
					));
				}
			}

			return null;
		};

		return (
			<Modal
				toolbar={
					<div style={{ width: '100%', textAlign: 'center' }}>
						<Segmented
							options={[
								{ value: 'party', label: 'Parties' },
								{ value: 'hero', label: 'Heroes' }
							]}
							value={mode}
							onChange={setMode}
						/>
					</div>
				}
				content={
					<div className='hero-select-modal'>
						<Space direction='vertical' style={{ width: '100%' }}>
							{getContent()}
						</Space>
					</div>
				}
				onClose={props.onClose}
			/>
		);
	} catch (ex) {
		console.error(ex);
		return null;
	}
};
