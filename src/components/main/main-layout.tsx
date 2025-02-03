import { Drawer } from 'antd';
import { Outlet } from 'react-router';
import { ReactNode } from 'react';

import pbds from '../../assets/powered-by-draw-steel.png';

interface Props {
	section: 'hero' | 'library' | 'encounter';
	nav: ReactNode;
	drawer: ReactNode;
	setNav: React.Dispatch<React.SetStateAction<ReactNode>>;
	setDrawer: React.Dispatch<React.SetStateAction<ReactNode>>;
}

export const MainLayout = (props: Props) => {
	return (
		<div className='main'>
			<div className='main-content'>
				<Outlet />
			</div>
			<div className='main-footer'>
				<div className='main-footer-section legal'>
					<img className='ds-logo' src={pbds} />
					FORGE STEEL is an independent product published under the DRAW STEEL Creator License and is not affiliated with MCDM Productions, LLC. DRAW STEEL © 2024 MCDM Productions, LLC.
				</div>
			</div>
			<Drawer placement='left' open={props.nav !== null} onClose={() => props.setNav(null)} closeIcon={null} width='250px'>
				{props.nav}
			</Drawer>
			<Drawer open={props.drawer !== null} onClose={() => props.setDrawer(null)} closeIcon={null} width='500px'>
				{props.drawer}
			</Drawer>
		</div>
	);
};
