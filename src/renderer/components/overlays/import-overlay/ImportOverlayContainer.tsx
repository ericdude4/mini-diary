import { connect } from "react-redux";

import { runImport } from "../../../store/import/actionCreators";
import { RootState, ThunkDispatchT } from "../../../store/store";
import ImportOverlay, { DispatchProps, StateProps } from "./ImportOverlay";

const mapStateToProps = (state: RootState): StateProps => ({
	importFormat: state.import.importFormat,
});

const mapDispatchToProps = (dispatch: ThunkDispatchT): DispatchProps => ({
	runImport: (fileContent: string): void => dispatch(runImport(fileContent)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ImportOverlay);
