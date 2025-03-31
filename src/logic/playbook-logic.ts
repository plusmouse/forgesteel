import { Counter } from '../models/counter';
import { Encounter } from '../models/encounter';
import { EncounterLogic } from './encounter-logic';
import { EncounterObjectiveData } from '../data/encounter-objective-data';
import { Hero } from '../models/hero';
import { MonsterLogic } from './monster-logic';
import { Montage } from '../models/montage';
import { Negotiation } from '../models/negotiation';
import { Options } from '../models/options';
import { Playbook } from '../models/playbook';
import { Plot } from '../models/plot';
import { Sourcebook } from '../models/sourcebook';
import { SourcebookLogic } from './sourcebook-logic';
import { Utils } from '../utils/utils';

export class PlaybookLogic {
	static getUsedIn = (playbook: Playbook, elementID: string) => {
		return [
			...playbook.encounters.filter(enc => EncounterLogic.getMonsterData(enc).map(data => data.monsterID).includes(elementID)),
			...playbook.adventures.filter(adv => PlaybookLogic.getContentIDs(adv.plot).includes(elementID))
		];
	};

	static getContentIDs = (plot: Plot) => {
		return PlaybookLogic
			.getAllPlotPoints(plot)
			.flatMap(p => p.content)
			.map(c => c.contentID)
			.filter(id => id !== null);
	};

	static getAllPlotPoints = (plot: Plot) => {
		const list: Plot[] = [];

		const addPoints = (plot: Plot) => {
			list.push(plot);
			plot.plots.forEach(addPoints);
		};

		addPoints(plot);
		return list;
	};

	static getPlotPoint = (plot: Plot, plotPointID: string) => {
		return PlaybookLogic.getAllPlotPoints(plot).find(p => p.id === plotPointID);
	};

	static getPlotPointParent = (plot: Plot, plotPointID: string) => {
		return PlaybookLogic.getAllPlotPoints(plot).find(p => p.plots.map(pp => pp.id).includes(plotPointID));
	};

	static getDownstreamPlotPoints = (plot: Plot, plotPointID: string) => {
		const downstream: Plot[] = [];

		const traverse = (id: string) => {
			const p = plot.plots.find(p => p.id === id);
			if (p) {
				if (!downstream.some(x => x.id === p.id)) {
					downstream.push(p);
				}
				p.links.forEach(l => traverse(l.plotID));
			}
		};

		traverse(plotPointID);

		return downstream;
	};

	static getUpstreamPlotPoints = (plot: Plot, plotPointID: string) => {
		return plot.plots.filter(p => {
			const down = PlaybookLogic.getDownstreamPlotPoints(plot, p.id).map(dsp => dsp.id);
			return down.includes(plotPointID);
		});
	};

	static startEncounter = (encounter: Encounter, sourcebooks: Sourcebook[], heroes: Hero[], options: Options) => {
		const copy = Utils.copy(encounter);
		copy.id = Utils.guid();
		copy.round = 0;

		copy.groups.forEach(group => {
			group.slots.forEach(slot => {
				const monster = SourcebookLogic.getMonster(sourcebooks, slot.monsterID);
				const monsterGroup = SourcebookLogic.getMonsterGroup(sourcebooks, slot.monsterID);
				if (monster && monsterGroup) {
					const name = MonsterLogic.getMonsterName(monster, monsterGroup);
					const count = slot.count * MonsterLogic.getRoleMultiplier(monster.role.organization, options);
					for (let n = 1; n <= count; ++n) {
						const monsterCopy = Utils.copy(monster);
						monsterCopy.id = Utils.guid();
						monsterCopy.name = count === 1 ? name : `${name} ${n}`;
						slot.monsters.push(monsterCopy);
					}
				}
			});
		});

		if (options.party !== '') {
			heroes
				.filter(h => h.folder === options.party)
				.forEach(h => copy.heroes.push(Utils.copy(h)));
		}

		copy.terrain.forEach(slot => {
			const terrain = SourcebookLogic.getTerrains(sourcebooks).find(t => t.id === slot.terrainID);
			if (terrain) {
				const name = terrain.name || 'Unnamed Terrain';
				const count = slot.count;
				for (let n = 1; n <= count; ++n) {
					const terrainCopy = Utils.copy(terrain);
					terrainCopy.id = Utils.guid();
					terrainCopy.name = name;
					slot.terrain.push(terrainCopy);
				}
			}
		});

		return copy;
	};

	static startMontage = (montage: Montage) => {
		const copy = Utils.copy(montage);
		copy.id = Utils.guid();

		return copy;
	};

	static startNegotiation = (negotiation: Negotiation) => {
		const copy = Utils.copy(negotiation);
		copy.id = Utils.guid();

		return copy;
	};

	static startCounter = (counter: Counter) => {
		const copy = Utils.copy(counter);
		copy.id = Utils.guid();

		return copy;
	};

	static updatePlaybook = (playbook: Playbook) => {
		if (playbook.adventures === undefined) {
			playbook.adventures = [];
		}

		playbook.encounters.forEach(e => {
			e.groups.forEach(g => {
				g.slots.forEach(s => {
					if (s.customization === undefined) {
						s.customization = {
							addOnIDs: []
						};
					}

					if (s.monsters === undefined) {
						s.monsters = [];
					}

					if (s.state === undefined) {
						s.state = {
							staminaDamage: 0,
							staminaTemp: 0,
							conditions: [],
							reactionUsed: false,
							defeated: false,
							captainID: undefined
						};
					}
				});

				if (e.heroes === undefined) {
					e.heroes = [];
				}
			});

			if (e.terrain === undefined) {
				e.terrain = [];
			}

			e.terrain.forEach(slot => {
				if (slot.terrain === undefined) {
					slot.terrain = [];
				}

				slot.terrain.forEach(t => {
					if (t.state === undefined) {
						t.state = {
							squares: 1,
							staminaDamage: 0
						};
					}
				});
			});

			if (e.objective === undefined) {
				e.objective = EncounterObjectiveData.diminishNumbers;
			}

			if (e.round === undefined) {
				e.round = 1;
			}

			if (e.malice === undefined) {
				e.malice = 0;
			}
		});

		if (playbook.montages === undefined) {
			playbook.montages = [];
		}

		if (playbook.negotiations === undefined) {
			playbook.negotiations = [];
		}

		playbook.negotiations.forEach(n => {
			if (n.impression === undefined) {
				n.impression = 1;
			}
		});

		if (playbook.tacticalMaps === undefined) {
			playbook.tacticalMaps = [];
		}

		playbook.tacticalMaps.forEach(tm => {
			if (tm.items === undefined) {
				tm.items = [];
			}
		});

		if (playbook.counters === undefined) {
			playbook.counters = [];
		}
	};
}
