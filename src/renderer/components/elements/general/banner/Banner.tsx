import ErrorIcon from "feather-icons/dist/icons/alert-triangle.svg?react";
import InfoIcon from "feather-icons/dist/icons/info.svg?react";
import React, { FunctionComponent, ReactElement } from "react";

import { BannerType } from "../../../../types";
import { iconProps } from "../../../../utils/icons";

interface Props {
	className?: string;
	message: string;
	bannerType: BannerType;
}

const Banner: FunctionComponent<Props> = (props: Props): ReactElement => {
	const { className, message, bannerType } = props;

	const icon = bannerType === "error" ? <ErrorIcon {...iconProps} /> : <InfoIcon {...iconProps} />;

	return (
		<div className={`banner banner-${bannerType} ${className || ""}`}>
			{icon}
			<p className="banner-message">{message}</p>
		</div>
	);
};

export default Banner;
