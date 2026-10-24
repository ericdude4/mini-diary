import { DayPicker } from "@daypicker/react";
import moment, { Moment } from "moment-timezone";
import React, { PureComponent, ReactElement, ReactNode } from "react";

import { Entries, Weekday } from "../../../../types";
import { createDate, parseDate, toDateString, toIndexDate } from "../../../../utils/dateFormat";
import CalendarNavContainer from "../calendar-nav/CalendarNavContainer";

export interface StateProps {
	allowFutureEntries: boolean;
	dateSelected: Moment;
	entries: Entries;
	firstDayOfWeek: Weekday | null;
}

export interface DispatchProps {
	setDateSelected: (date: Moment) => void;
}

type Props = StateProps & DispatchProps;

// Use Moment.js (which is set to the app language) for localizing the calendar
const formatters = {
	formatWeekdayName: (date: Date): string => parseDate(date).format("dd"),
};
const labels = {
	labelDayButton: (date: Date): string => toDateString(parseDate(date)),
};

// The month name is displayed by `CalendarNav` instead
function HiddenMonthCaption(): ReactElement {
	return <></>;
}

export default class Calendar extends PureComponent<Props> {
	constructor(props: Props) {
		super(props);

		// Function bindings
		this.onDateSelection = this.onDateSelection.bind(this);
	}

	onDateSelection(date: Date): void {
		const { allowFutureEntries, setDateSelected } = this.props;
		const parsedDate = parseDate(date);
		const today = createDate();

		if (allowFutureEntries || parseDate(date).isSameOrBefore(today, "day")) {
			setDateSelected(parsedDate);
		}
	}

	render(): ReactNode {
		const { allowFutureEntries, dateSelected, entries, firstDayOfWeek } = this.props;

		const today = createDate();
		const daysWithEntries = new Set(Object.keys(entries));

		const hasEntry = (date: Date): boolean => {
			const indexDate = toIndexDate(parseDate(date));
			return daysWithEntries.has(indexDate);
		};

		const dateSelectedObj = dateSelected.toDate();
		const todayObj = today.toDate();

		return (
			<div className="calendar">
				<CalendarNavContainer />
				<DayPicker
					mode="single"
					required
					month={dateSelectedObj}
					selected={dateSelectedObj}
					today={todayObj}
					disabled={allowFutureEntries ? undefined : { after: todayObj }}
					modifiers={{ hasEntry }}
					modifiersClassNames={{ hasEntry: "rdp-has-entry" }}
					weekStartsOn={firstDayOfWeek ?? (moment.localeData().firstDayOfWeek() as Weekday)}
					formatters={formatters}
					labels={labels}
					hideNavigation
					components={{ MonthCaption: HiddenMonthCaption }}
					onDayClick={this.onDateSelection}
				/>
			</div>
		);
	}
}
