import { connect } from "react-redux";

import { RootState } from "../../../../store/store";
import DayPhotos, { StateProps } from "./DayPhotos";

const mapStateToProps = (state: RootState): StateProps => ({
	dateSelected: state.diary.dateSelected,
	showPhotos: state.app.showPhotos,
});

export default connect(mapStateToProps)(DayPhotos);
