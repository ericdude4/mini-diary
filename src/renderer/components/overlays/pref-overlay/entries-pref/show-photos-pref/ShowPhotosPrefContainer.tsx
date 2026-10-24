import { connect } from "react-redux";

import { updateShowPhotosPref } from "../../../../../store/app/actionCreators";
import { RootState, ThunkDispatchT } from "../../../../../store/store";
import ShowPhotosPref, { DispatchProps, StateProps } from "./ShowPhotosPref";

const mapStateToProps = (state: RootState): StateProps => ({
	showPhotos: state.app.showPhotos,
});

const mapDispatchToProps = (dispatch: ThunkDispatchT): DispatchProps => ({
	updateShowPhotosPref: (showPhotos: boolean): void => dispatch(updateShowPhotosPref(showPhotos)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ShowPhotosPref);
