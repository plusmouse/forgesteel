import './in-progress.scss';

export const InProgressModal = () => {
	try {
		return (
			<div className='in-progress-modal'>
				<div className='warning-text'>
					This is a work-in-progress.
				</div>
				<div className='ds-text'>
					Specifically, here are some pieces that haven't been added yet:
				</div>
				<ul>
					<li>Devil: Fiendish Features</li>
					<li>Dragon Knight: Knighthood</li>
					<li>Revenant: Former Life</li>
					<li>Conduit class</li>
					<li>Elementalist class</li>
					<li>Fury class</li>
					<li>Tactician class</li>
				</ul>
				<div className='ds-text'>
					You can help by submitting bug reports <a href='https://github.com/andyaiken/forgesteel/issues/' target='_blank'>here</a>.
				</div>
			</div>
		);
	} catch {
		return null;
	}
};