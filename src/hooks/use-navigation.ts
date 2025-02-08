import { PlaybookElementKind } from '../models/playbook';
import { SourcebookElementKind } from '../models/sourcebook';
import { useNavigate } from 'react-router';

export const useNavigation = () => {
	const navigate = useNavigate();

	return {
		goToWelcome: () => {
			return navigate('/');
		},
		goToHeroList: () => {
			return navigate('/hero');
		},
		goToHeroView: (heroID: string) => {
			return navigate(`/hero/view/${heroID}`);
		},
		goToHeroEdit: (heroID: string, tab: string) => {
			return navigate(`/hero/edit/${heroID}/${tab}`);
		},
		goToLibraryList: (kind: SourcebookElementKind) => {
			return navigate(`/library/${kind}`);
		},
		goToLibraryView: (kind: SourcebookElementKind, elementID: string, subElementID?: string) => {
			if (subElementID) {
				return navigate(`/library/view/${kind}/${elementID}/${subElementID}`);
			}
			return navigate(`/library/view/${kind}/${elementID}`);
		},
		goToLibraryEdit: (kind: SourcebookElementKind, sourcebookID: string, elementID: string, subElementID?: string) => {
			if (subElementID) {
				return navigate(`/library/edit/${kind}/${sourcebookID}/${elementID}/${subElementID}`);
			}
			return navigate(`/library/edit/${kind}/${sourcebookID}/${elementID}`);
		},
		goToPlaybookList: (kind: PlaybookElementKind) => {
			return navigate(`/playbook/${kind}`);
		},
		goToPlaybookView: (kind: PlaybookElementKind, elementID: string) => {
			return navigate(`/playbook/view/${kind}/${elementID}`);
		},
		goToPlaybookEdit: (kind: PlaybookElementKind, elementID: string) => {
			return navigate(`/playbook/edit/${kind}/${elementID}`);
		}
	};
};
