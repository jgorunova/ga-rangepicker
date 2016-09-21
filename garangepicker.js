/**
* @version: 1.0
* @author: Dan Grossman http://www.dangrossman.info/
* @copyright: Copyright (c) 2012-2015 Dan Grossman. All rights reserved.
* @license: Licensed under the MIT license. See http://www.opensource.org/licenses/mit-license.php
* @website: https://www.improvely.com/
*/

(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(['moment', 'jquery', 'exports'], function(momentjs, $, exports) {
      root.garangepicker = factory(root, exports, momentjs, $);
    });

  } else if (typeof exports !== 'undefined') {
    var momentjs = require('moment');
    var jQuery = window.jQuery;
    if (jQuery === undefined) {
      try {
        jQuery = require('jquery');
      } catch (err) {
        if (!jQuery) throw new Error('jQuery dependency not found');
      }
    }

    factory(root, exports, momentjs, jQuery);

  // Finally, as a browser global.
  } else {
    root.garangepicker = factory(root, {}, root.moment || moment, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, garangepicker, moment, $) {

    var GaRangePicker = function(element, options, cb) {
        //default settings for options
        this.parentEl = 'body';
        this.element = $(element);
        this.startDate = moment().startOf('day');
        this.endDate = moment().endOf('day');
        this.timeZone = moment().utcOffset();
        this.minDate = false;
        this.maxDate = false;
        this.autoUpdateInput = true;
        this.showTime = false;

        this.opens = 'right';
        if (this.element.hasClass('pull-right'))
            this.opens = 'left';

        this.drops = 'down';
        if (this.element.hasClass('dropup'))
            this.drops = 'up';

        this.buttonClasses = 'btn btn-sm';
        this.applyClass = 'btn-primary';
        this.cancelClass = 'btn-default';
        this.activeDate = 'start';

        this.locale = {
            format: 'MM/DD/YYYY',
            dateFormat: 'MM/DD/YYYY',
            separator: ' - ',
            applyLabel: 'Apply',
            cancelLabel: 'Cancel',
            weekLabel: 'W',
            customRangeLabel: 'Custom Range',
            daysOfWeek: moment.weekdaysMin(),
            monthNames: moment.monthsShort(),
            firstDay: moment.localeData().firstDayOfWeek()
        };

        this.callback = function() { };

        //some state information
        this.isShowing = false;
        this.leftCalendar = {};
        this.middleCalendar = {};
        this.rightCalendar = {};

        //custom options from user
        if (typeof options !== 'object' || options === null)
            options = {};

        //allow setting options with data attributes
        //data-api options will be overwritten with custom javascript options
        options = $.extend(this.element.data(), options);

        //html template for the picker UI
        if (typeof options.template !== 'string')
        options.template = '<div class="garangepicker dropdown-menu">' +
            '<div class="calendar left">' +

                '<div class="calendar-table"></div>' +
            '</div>' +
            '<div class="calendar middle">' +
                '<div class="calendar-table"></div>' +
            '</div>' +
            '<div class="calendar right">' +
                '<div class="calendar-table"></div>' +
            '</div>' +
            '<div class="ranges">' +
                'From:' +
                '<div class="garangepicker_input">' +
                  '<input class="input-mini" type="text" name="garangepicker_start" value="" />' +
                  '<i class="fa fa-calendar glyphicon glyphicon-calendar"></i>' +
                  '<div class="garangepicker_time">' +
                    '<select class="gahour" name="hour_start"></select>' +
                    '<span class="gadivider">&nbsp;:&nbsp;</span>' +
                    '<select class="gaminute" name="minute_start"></select>' +
                '</div>' +
                '</div>' +

                'To:' +
                '<div class="garangepicker_input">' +
                  '<input class="input-mini" type="text" name="garangepicker_end" value="" />' +
                  '<i class="fa fa-calendar glyphicon glyphicon-calendar"></i>' +
                  '<div class="garangepicker_time">' +
                    '<select class="gahour" name="hour_end"></select>' +
                    '<span class="gadivider">&nbsp;:&nbsp;</span>' +
                    '<select class="gaminute" name="minute_end"></select>' +
                  '</div>' +
                '</div>' +
                '<table class="fastlinks">' +
                '<tr>' +
                  '<td><a class="today">Today</a></td><td><a class="month">This Month</a></td>' +
                 '</tr>' +
                 '<tr>' +
                   '<td><a class="week">This Week</a></td><td><a class="3months">Last 3 Months</a></td>' +
                  '</tr>' +
                '</table>' +
                '<br>' +
                '<div class="range_inputs">' +
                    '<button class="applyBtn" disabled="disabled" type="button"></button> ' +
                    '<button class="cancelBtn" type="button"></button>' +
                '</div>' +
            '</div>' +
        '</div>';

        this.parentEl = (options.parentEl && $(options.parentEl).length) ? $(options.parentEl) : $(this.parentEl);
        this.container = $(options.template).appendTo(this.parentEl);

        // bind the time zone used to build the calendar to either the timeZone passed in through the options or the zone of the startDate (which will be the local time zone by default)
        if (typeof options.timeZone === 'string' || typeof options.timeZone === 'number') {
            if (typeof options.timeZone === 'string' && typeof moment.tz !== 'undefined') {
                this.timeZone = moment.tz.zone(options.timeZone).parse(new Date) * -1;  // Offset is positive if the timezone is behind UTC and negative if it is ahead.
            } else {
                this.timeZone = options.timeZone;
            }
        }

        if (typeof options.locale === 'object') {
            if (typeof options.locale.format === 'string')
                this.locale.format = options.locale.format;

            this.locale.dateFormat = this.locale.format;
            if (typeof options.locale.dateFormat === 'string')
                this.locale.dateFormat = options.locale.dateFormat;

            if (typeof options.locale.separator === 'string')
                this.locale.separator = options.locale.separator;

            if (typeof options.locale.daysOfWeek === 'object')
                this.locale.daysOfWeek = options.locale.daysOfWeek.slice();

            if (typeof options.locale.monthNames === 'object')
              this.locale.monthNames = options.locale.monthNames.slice();

            if (typeof options.locale.firstDay === 'number')
              this.locale.firstDay = options.locale.firstDay;

            if (typeof options.locale.applyLabel === 'string')
              this.locale.applyLabel = options.locale.applyLabel;

            if (typeof options.locale.cancelLabel === 'string')
              this.locale.cancelLabel = options.locale.cancelLabel;

            if (typeof options.locale.weekLabel === 'string')
              this.locale.weekLabel = options.locale.weekLabel;

            if (typeof options.locale.customRangeLabel === 'string')
              this.locale.customRangeLabel = options.locale.customRangeLabel;

        }

        if (typeof options.startDate === 'string')
            this.startDate = moment(options.startDate, this.locale.format);

        if (typeof options.endDate === 'string')
            this.endDate = moment(options.endDate, this.locale.format);

        if (typeof options.minDate === 'string')
            this.minDate = moment(options.minDate, this.locale.format);

        if (typeof options.maxDate === 'string')
            this.maxDate = moment(options.maxDate, this.locale.format);

        if (typeof options.startDate === 'object')
            this.startDate = moment(options.startDate);

        if (typeof options.endDate === 'object')
            this.endDate = moment(options.endDate);

        if (typeof options.minDate === 'object')
            this.minDate = moment(options.minDate);

        if (typeof options.maxDate === 'object')
            this.maxDate = moment(options.maxDate);

        if (typeof options.showTime === 'boolean')
            this.showTime = options.showTime;

        // sanity check for bad options
        if (this.minDate && this.startDate.isBefore(this.minDate))
            this.startDate = this.minDate.clone();

        // sanity check for bad options
        if (this.maxDate && this.endDate.isAfter(this.maxDate))
            this.endDate = this.maxDate.clone();

        if (typeof options.applyClass === 'string')
            this.applyClass = options.applyClass;

        if (typeof options.cancelClass === 'string')
            this.cancelClass = options.cancelClass;

        if (typeof options.opens === 'string')
            this.opens = options.opens;

        if (typeof options.drops === 'string')
            this.drops = options.drops;

        if (typeof options.buttonClasses === 'string')
            this.buttonClasses = options.buttonClasses;

        if (typeof options.buttonClasses === 'object')
            this.buttonClasses = options.buttonClasses.join(' ');

        if (typeof options.autoUpdateInput === 'boolean')
            this.autoUpdateInput = options.autoUpdateInput;

        if (typeof options.isInvalidDate === 'function')
            this.isInvalidDate = options.isInvalidDate;

        // set timezones
        this.startDate && this.startDate.utcOffset(this.timeZone);
        this.endDate && this.endDate.utcOffset(this.timeZone);
        this.minDate && this.minDate.utcOffset(this.timeZone);
        this.maxDate && this.maxDate.utcOffset(this.timeZone);

        this.setStartDate(this.startDate);
        this.setEndDate(this.endDate);

        // update day names order to firstDay
        if (this.locale.firstDay != 0) {
            var iterator = this.locale.firstDay;
            while (iterator > 0) {
                this.locale.daysOfWeek.push(this.locale.daysOfWeek.shift());
                iterator--;
            }
        }

        // update hours select
        var html, num;
        for (var i = 0; i <= 23; i++) {
            num = i + '';
            num = (num.length == 1) ? '0'+num : num;
            html += '<option value="' + i + '">' + num + '</option>';
        }
        this.container.find('select[name="hour_start"]').html(html);
        this.container.find('select[name="hour_end"]').html(html);

        // update minutes select
        var html, num;
        for (var i = 0; i <= 59; i++) {
            num = i + '';
            num = (num.length == 1) ? '0'+num : num;
            html += '<option value="' + i + '">' + num + '</option>';
        }
        this.container.find('select[name="minute_start"]').html(html);
        this.container.find('select[name="minute_end"]').html(html);

        if (typeof cb === 'function') {
            this.callback = cb;
        }

        this.container.addClass('show-calendar');
        this.container.addClass('opens' + this.opens);

        //apply CSS classes and labels to buttons
        this.container.find('.applyBtn, .cancelBtn').addClass(this.buttonClasses);
        if (this.applyClass.length)
            this.container.find('.applyBtn').addClass(this.applyClass);
        if (this.cancelClass.length)
            this.container.find('.cancelBtn').addClass(this.cancelClass);
        this.container.find('.applyBtn').html(this.locale.applyLabel);
        this.container.find('.cancelBtn').html(this.locale.cancelLabel);
        if(this.showTime)
            this.container.addClass('with-time');
        //
        // event listeners
        //

        this.container.find('.calendar')
            .on('click.garangepicker', '.prev', $.proxy(this.clickPrev, this))
            .on('click.garangepicker', '.next', $.proxy(this.clickNext, this))
            .on('click.garangepicker', 'td.available', $.proxy(this.clickDate, this))
            .on('click.garangepicker', '.garangepicker_input input', $.proxy(this.showCalendars, this))
            .on('change.garangepicker', '.garangepicker_input input', $.proxy(this.formInputsChanged, this));

        this.container.find('.ranges')
            .on('click.garangepicker', 'button.applyBtn', $.proxy(this.clickApply, this))
            .on('click.garangepicker', 'button.cancelBtn', $.proxy(this.clickCancel, this))
            .on('.garangepicker_input input', $.proxy(this.formInputsChanged, this))
            .on('click.garangepicker_input input', $.proxy(this.formInputFocused, this));

        this.container.find('.fastlinks')
            .on('click', '.today', $.proxy(this.setToday, this))
            .on('click', '.week', $.proxy(this.setLastWeek, this))
            .on('click', '.month', $.proxy(this.setLastMonth, this))
            .on('click', '.3months', $.proxy(this.setLast3Months, this));

        if (this.element.is('input')) {
            this.element.on({
                'click.garangepicker': $.proxy(this.show, this),
                'focus.garangepicker': $.proxy(this.show, this),
                'keyup.garangepicker': $.proxy(this.elementChanged, this),
                'keydown.garangepicker': $.proxy(this.keydown, this)
            });
        } else {
            this.element.on('click.garangepicker', $.proxy(this.toggle, this));
        }

        //
        // if attached to a text input, set the initial value
        //
        if (this.element.is('input') && this.autoUpdateInput) {
            this.element.val(this.startDate.format(this.locale.format) + this.locale.separator + this.endDate.format(this.locale.format));
            this.element.trigger('change');
        } else if (this.element.is('input') && this.autoUpdateInput) {
            this.element.val(this.startDate.format(this.locale.format));
            this.element.trigger('change');
        }

    };

    GaRangePicker.prototype = {

        constructor: GaRangePicker,

        setStartDate: function(startDate) {
            if (typeof startDate === 'string')
                startDate = moment(startDate, this.locale.format).utcOffset(this.timeZone);

            if (typeof startDate === 'object')
                startDate = moment(startDate.clone()).utcOffset(this.timeZone);

            this.startDate = startDate.clone();
            this.startDate.startOf('day');
            this.startDate.hours(startDate.hours());
            this.startDate.minutes(startDate.minutes());

            if (this.minDate && this.startDate.isBefore(this.minDate))
                this.startDate = this.minDate;

            if (this.maxDate && this.startDate.isAfter(this.maxDate))
                this.startDate = this.maxDate;

            if (!this.isShowing)
                this.updateElement();

            this.updateMonthsInView();
            this.container.find('input[name="garangepicker_start"]').removeClass('has_errors');
        },

        setEndDate: function(endDate) {
            if (typeof endDate === 'string')
                endDate = moment(endDate, this.locale.format).utcOffset(this.timeZone);

            if (typeof endDate === 'object')
                endDate = moment(endDate.clone()).utcOffset(this.timeZone);;

            this.endDate = endDate.clone();
            this.endDate.endOf('day');
            this.endDate.hours(endDate.hours());
            this.endDate.minutes(endDate.minutes());

            if (this.endDate.isBefore(this.startDate))
                this.endDate = this.startDate.clone();

            if (this.maxDate && this.endDate.isAfter(this.maxDate))
                this.endDate = this.maxDate;

            if (!this.isShowing)
                this.updateElement();

            this.updateMonthsInView();
            this.container.find('input[name="garangepicker_end"]').removeClass('has_errors');
        },

        isInvalidDate: function() {
            return false;
        },

        updateView: function() {
            if (this.activeDate == 'start') {
                this.container.find('input[name="garangepicker_end"]').removeClass('active');
                this.container.find('input[name="garangepicker_start"]').addClass('active');
                this.activeDate = 'start';
            } else {
                this.container.find('input[name="garangepicker_end"]').addClass('active');
                this.container.find('input[name="garangepicker_start"]').removeClass('active');
                this.activeDate = 'end';
            }
            this.updateMonthsInView();
            this.updateCalendars();
            this.updateFormInputs();
        },

        updateMonthsInView: function() {
            if (this.endDate) {

                //if both dates are visible already, do nothing
                if (this.leftCalendar.month && this.middleCalendar.month && this.rightCalendar.month &&
                    (this.startDate.format('YYYY-MM') == this.leftCalendar.month.format('YYYY-MM') ||
                    this.startDate.format('YYYY-MM') == this.middleCalendar.month.format('YYYY-MM') ||
                    this.startDate.format('YYYY-MM') == this.rightCalendar.month.format('YYYY-MM') ||
                    this.endDate.format('YYYY-MM') == this.leftCalendar.month.format('YYYY-MM') ||
                    this.endDate.format('YYYY-MM') == this.middleCalendar.month.format('YYYY-MM') ||
                    this.endDate.format('YYYY-MM') == this.rightCalendar.month.format('YYYY-MM'))
                    ) {
                    return;
                }

                this.leftCalendar.month = this.endDate.clone().date(2).subtract(2, 'month');
                this.middleCalendar.month = this.endDate.clone().date(2).subtract(1, 'month');
                this.rightCalendar.month = this.endDate.clone().date(2); //.add(2, 'month');
            } else {
                if (this.leftCalendar.month.format('YYYY-MM') != this.endDate.format('YYYY-MM') &&
                    this.middleCalendar.month.format('YYYY-MM') != this.endDate.format('YYYY-MM') &&
                    this.rightCalendar.month.format('YYYY-MM') != this.endDate.format('YYYY-MM')) {

                    this.leftCalendar.month = this.startDate.clone().date(2);
                    this.middleCalendar.month = this.startDate.clone().date(2).add(1, 'month');
                    this.rightCalendar.month = this.startDate.clone().date(2).add(2, 'month');
                }
            }
        },

        updateCalendars: function() {
            this.renderCalendar('left');
            this.renderCalendar('middle');
            this.renderCalendar('right');
            this.showCalendars();
        },

        renderCalendar: function(side) {
            var calendar;
            if(side == 'left') {
                calendar = this.leftCalendar;
            } else if(side == 'middle') {
                calendar = this.middleCalendar;
            } else {
                calendar = this.rightCalendar;
            }

            var month = calendar.month.month();
            var year = calendar.month.year();
            var daysInMonth = moment([year, month]).daysInMonth();
            var firstDay = moment([year, month, 1]).utcOffset(this.timeZone, true);
            var lastDay = moment([year, month, daysInMonth]).utcOffset(this.timeZone, true);
            var lastMonth = moment(firstDay).subtract(1, 'month').month();
            var lastYear = moment(firstDay).subtract(1, 'month').year();
            var daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
            var dayOfWeek = firstDay.day();

            //initialize a 6 rows x 7 columns array for the calendar
            var calendar = [];
            calendar.firstDay = firstDay;
            calendar.lastDay = lastDay;

            for (var i = 0; i < 7; i++) {
                calendar[i] = [];
            }

            //populate the calendar with date objects
            var startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
            if (startDay > daysInLastMonth)
                startDay -= 7;

            if (dayOfWeek == this.locale.firstDay)
                startDay = daysInLastMonth - 6;

            var curDate = moment([lastYear, lastMonth, startDay, 0, 0, 0]).utcOffset(this.timeZone, true);

            var col, row;
            for (var i = 0, col = 0, row = 0; i < 49; i++, col++, curDate = moment(curDate).add(24, 'hour')) {
                if (i > 0 && col % 7 === 0) {
                    col = 0;
                    row++;
                }
                calendar[row][col] = curDate.clone();

                if (this.minDate && calendar[row][col].format('YYYY-MM-DD') == this.minDate.format('YYYY-MM-DD') && calendar[row][col].isBefore(this.minDate) && side == 'left') {
                    calendar[row][col] = this.minDate.clone();
                }

                if (this.maxDate && calendar[row][col].format('YYYY-MM-DD') == this.maxDate.format('YYYY-MM-DD') && calendar[row][col].isAfter(this.maxDate) && side == 'middle') {
                    calendar[row][col] = this.maxDate.clone();
                }
            }
            if(calendar[0][6].month() != calendar[1][0].month()) {
                calendar.shift();
            }
            //make the calendar object available to hoverDate/clickDate
            if (side == 'left') {
                this.leftCalendar.calendar = calendar;
            } else if(side == 'middle'){
                this.middleCalendar.calendar = calendar;
            } else {
                this.rightCalendar.calendar = calendar;
            }

            // Display the calendar
            var minDate = side == 'left' ? this.minDate : this.startDate;
            var maxDate = this.maxDate;
            var selected = side == 'left' ? this.startDate : this.endDate;

            var html = '<table class="table-condensed">';
            html += '<thead>';
            html += '<tr>';

            if ((!minDate || minDate.isBefore(calendar.firstDay)) && (side == 'left')) {
                html += '<th class="prev available"><i class="fa fa-chevron-left glyphicon glyphicon-chevron-left"></i></th>';
            } else {
                html += '<th></th>';
            }

            var dateHtml = this.locale.monthNames[calendar[3][1].month()] + calendar[1][1].format(" YYYY");

            html += '<th colspan="5" class="month">' + dateHtml + '</th>';
            if ((!maxDate || maxDate.isAfter(calendar.lastDay)) && (side == 'right')) {
                html += '<th class="next available"><i class="fa fa-chevron-right glyphicon glyphicon-chevron-right"></i></th>';
            } else {
                html += '<th></th>';
            }

            html += '</tr>';
            html += '<tr>';

            $.each(this.locale.daysOfWeek, function(index, dayOfWeek) {
                html += '<th>' + dayOfWeek + '</th>';
            });

            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';

            for (var row = 0; row < 6; row++) {
                html += '<tr>';

                for (var col = 0; col < 7; col++) {

                    var classes = [];

                    //highlight today's date
                    if (calendar[row][col].isSame(new Date(), "day"))
                        classes.push('today');

                    //highlight weekends
                    if (calendar[row][col].isoWeekday() > 5)
                        classes.push('weekend');

                    //grey out the dates in other months displayed at beginning and end of this calendar
                    if (calendar[row][col].month() != calendar[1][1].month())
                        classes.push('off', 'disabled');

                    //don't allow selection of dates before the minimum date
                    if (this.minDate && calendar[row][col].isBefore(this.minDate, 'day'))
                        classes.push('off', 'disabled');

                    //don't allow selection of dates after the maximum date
                    if (maxDate && calendar[row][col].isAfter(maxDate, 'day'))
                        classes.push('off', 'disabled');

                    //don't allow selection of date if a custom function decides it's invalid
                    if (this.isInvalidDate(calendar[row][col]))
                        classes.push('off', 'disabled');

                    //highlight the currently selected start date
                    if (calendar[row][col].format('YYYY-MM-DD') == this.startDate.format('YYYY-MM-DD'))
                        classes.push('active', 'start-date');

                    //highlight the currently selected end date
                    if (this.endDate != null && calendar[row][col].format('YYYY-MM-DD') == this.endDate.format('YYYY-MM-DD'))
                        classes.push('active', 'end-date');

                    //highlight dates in-between the selected dates
                    if (this.endDate != null && calendar[row][col] > this.startDate && calendar[row][col] < this.endDate)
                        classes.push('in-range');

                    var cname = '', disabled = false;
                    for (var i = 0; i < classes.length; i++) {
                        cname += classes[i] + ' ';
                        if (classes[i] == 'disabled')
                            disabled = true;
                    }
                    if (!disabled)
                        cname += 'available';

                    html += '<td class="' + cname.replace(/^\s+|\s+$/g, '') + '" data-title="' + 'r' + row + 'c' + col + '">' + calendar[row][col].date() + '</td>';

                }
                html += '</tr>';
            }

            html += '</tbody>';
            html += '</table>';

            this.container.find('.calendar.' + side + ' .calendar-table').html(html);
        },

        updateFormInputs: function() {
            //ignore mouse movements while an above-calendar text input has focus
            this.container.find('input[name=garangepicker_start]').val(this.startDate.format(this.locale.dateFormat));
            this.container.find('select[name=hour_start]').val(this.startDate.hours());
            this.container.find('select[name=minute_start]').val(this.startDate.minutes());
            if (this.endDate) {
                this.container.find('input[name=garangepicker_end]').val(this.endDate.format(this.locale.dateFormat));
                this.container.find('select[name=hour_end]').val(this.endDate.hours());
                this.container.find('select[name=minute_end]').val(this.endDate.minutes());
            }
            if (this.endDate && (this.startDate.isBefore(this.endDate) || this.startDate.isSame(this.endDate))) {
                this.container.find('button.applyBtn').removeAttr('disabled');
            } else {
                this.container.find('button.applyBtn').attr('disabled', 'disabled');
            }

        },

        move: function() {
            var parentOffset = { top: 0, left: 0 },
                containerTop;
            var parentRightEdge = $(window).width();
            if (!this.parentEl.is('body')) {
                parentOffset = {
                    top: this.parentEl.offset().top - this.parentEl.scrollTop(),
                    left: this.parentEl.offset().left - this.parentEl.scrollLeft()
                };
                parentRightEdge = this.parentEl[0].clientWidth + this.parentEl.offset().left;
            }

            if (this.drops == 'up')
                containerTop = this.element.offset().top - this.container.outerHeight() - parentOffset.top;
            else
                containerTop = this.element.offset().top + this.element.outerHeight() - parentOffset.top;
            this.container[this.drops == 'up' ? 'addClass' : 'removeClass']('dropup');

            if (this.opens == 'left') {
                this.container.css({
                    top: containerTop,
                    right: parentRightEdge - this.element.offset().left - this.element.outerWidth(),
                    left: 'auto'
                });
                if (this.container.offset().left < 0) {
                    this.container.css({
                        right: 'auto',
                        left: 9
                    });
                }
            } else if (this.opens == 'center') {
                this.container.css({
                    top: containerTop,
                    left: this.element.offset().left - parentOffset.left + this.element.outerWidth() / 2
                            - this.container.outerWidth() / 2,
                    right: 'auto'
                });
                if (this.container.offset().left < 0) {
                    this.container.css({
                        right: 'auto',
                        left: 9
                    });
                }
            } else {
                this.container.css({
                    top: containerTop,
                    left: this.element.offset().left - parentOffset.left,
                    right: 'auto'
                });
                if (this.container.offset().left + this.container.outerWidth() > $(window).width()) {
                    this.container.css({
                        left: 'auto',
                        right: 0
                    });
                }
            }
        },

        show: function(e) {
            if (this.isShowing) return;

            // Create a click proxy that is private to this instance of datepicker, for unbinding
            this._outsideClickProxy = $.proxy(function(e) { this.outsideClick(e); }, this);
            // Bind global datepicker mousedown for hiding and
            $(document)
              .on('mousedown.garangepicker', this._outsideClickProxy)
              // also support mobile devices
              .on('touchend.garangepicker', this._outsideClickProxy)
              // also explicitly play nice with Bootstrap dropdowns, which stopPropagation when clicking them
              .on('click.garangepicker', '[data-toggle=dropdown]', this._outsideClickProxy)
              // and also close when focus changes to outside the picker (eg. tabbing between controls)
              .on('focusin.garangepicker', this._outsideClickProxy);

            this.oldStartDate = this.startDate.clone();
            this.oldEndDate = this.endDate.clone();

            this.updateView();
            this.container.show();
            this.move();
            this.element.trigger('show.garangepicker', this);
            this.isShowing = true;
        },

        hide: function(e) {
            if (!this.isShowing) return;

            //incomplete date selection, revert to last values
            if (!this.endDate) {
                this.startDate = this.oldStartDate.clone();
                this.endDate = this.oldEndDate.clone();
            }

            //if a new date range was selected, invoke the user callback function
            if (!this.startDate.isSame(this.oldStartDate) || !this.endDate.isSame(this.oldEndDate))
                this.callback(this.startDate, this.endDate, this.chosenLabel);

            //if picker is attached to a text input, update it
            this.updateElement();

            $(document).off('.garangepicker');
            this.container.hide();
            this.element.trigger('hide.garangepicker', this);
            this.isShowing = false;
        },

        toggle: function(e) {
            if (this.isShowing) {
                this.hide();
            } else {
                this.show();
            }
        },

        outsideClick: function(e) {
            var target = $(e.target);
            // if the page is clicked anywhere except within the daterangerpicker/button
            // itself then call this.hide()
            if (
                // ie modal dialog fix
                e.type == "focusin" ||
                target.closest(this.element).length ||
                target.closest(this.container).length ||
                target.closest('.calendar-table').length
                ) return;
            this.hide();
        },

        showCalendars: function() {
            this.container.addClass('show-calendar');
            this.move();
            this.element.trigger('showCalendar.garangepicker', this);
        },

        hideCalendars: function() {
            this.container.removeClass('show-calendar');
            this.element.trigger('hideCalendar.garangepicker', this);
        },

        clickPrev: function(e) {
            var cal = $(e.target).parents('.calendar');
            if (cal.hasClass('left')) {
                this.leftCalendar.month.subtract(1, 'month');
                this.middleCalendar.month.subtract(1, 'month');
                this.rightCalendar.month.subtract(1, 'month');

            } else {
                this.middleCalendar.month.subtract(1, 'month');
                this.rightCalendar.month.subtract(1, 'month');
            }
            this.updateCalendars();
        },

        clickNext: function(e) {
            var cal = $(e.target).parents('.calendar');
            if (cal.hasClass('left')) {
                this.leftCalendar.month.add(1, 'month');
            } else {
                this.middleCalendar.month.add(1, 'month');
                this.rightCalendar.month.add(1, 'month');
                this.leftCalendar.month.add(1, 'month');

            }
            this.updateCalendars();
        },

        hoverDate: function(e) {

            //ignore mouse movements while an above-calendar text input has focus
            //if (this.container.find('input[name=garangepicker_start]').is(":focus") || this.container.find('input[name=garangepicker_end]').is(":focus"))
            //    return;

            //ignore dates that can't be selected
            if (!$(e.target).hasClass('available')) return;

            //have the text inputs above calendars reflect the date being hovered over
            var title = $(e.target).attr('data-title');
            var row = title.substr(1, 1);
            var col = title.substr(3, 1);
            var cal = $(e.target).parents('.calendar');
            var date = cal.hasClass('left') ? this.leftCalendar.calendar[row][col] : (cal.hasClass('middle') ? this.middleCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col]);

            //highlight the dates between the start date and the date being hovered as a potential end date
            var leftCalendar = this.leftCalendar;
            var middleCalendar = this.middleCalendar;
            var rightCalendar = this.rightCalendar;
            var startDate = this.startDate;
            var endDate = this.endDate;
            if (this.activeDate == 'end') {
                this.container.find('.calendar td').each(function(index, el) {

                    //skip week numbers, only look at dates
                    if ($(el).hasClass('week')) return;

                    var title = $(el).attr('data-title');
                    var row = title.substr(1, 1);
                    var col = title.substr(3, 1);
                    var cal = $(el).parents('.calendar');
                    var dt = cal.hasClass('left') ? leftCalendar.calendar[row][col] : (cal.hasClass('middle') ? middleCalendar.calendar[row][col] : rightCalendar.calendar[row][col]);

                    if ((   dt.isAfter(startDate) && dt.isBefore(date)  )) {
                        $(el).addClass('in-range');
                    } else {
                        $(el).removeClass('in-range');
                    }

                });
            } else {
                this.container.find('.calendar td').each(function(index, el) {

                    //skip week numbers, only look at dates
                    if ($(el).hasClass('week')) return;

                    var title = $(el).attr('data-title');
                    var row = title.substr(1, 1);
                    var col = title.substr(3, 1);
                    var cal = $(el).parents('.calendar');
                    var dt = cal.hasClass('left') ? leftCalendar.calendar[row][col] : (cal.hasClass('middle') ? middleCalendar.calendar[row][col] : rightCalendar.calendar[row][col]);

                    if ((   dt.isAfter(date) && dt.isBefore(endDate)  )) {
                        $(el).addClass('in-range');
                    } else {
                        $(el).removeClass('in-range');
                    }

                });
            }

        },

        clickDate: function(e) {

            if (!$(e.target).hasClass('available')) return;

            var title = $(e.target).attr('data-title');
            var row = title.substr(1, 1);
            var col = title.substr(3, 1);
            var cal = $(e.target).parents('.calendar');
            var date = cal.hasClass('left') ? this.leftCalendar.calendar[row][col] : (cal.hasClass('middle') ? this.middleCalendar.calendar[row][col] :  this.rightCalendar.calendar[row][col]);

            var sd = this.startDate, ed = this.endDate;
            if(this.activeDate == 'start' ||  date.isBefore(this.startDate)) {
                sd = date;

                var start = date.clone().startOf('day');
                this.setStartDate(start);

                this.activeDate = 'end';
                if(date.isAfter(this.endDate)) {
                    var end = date.clone().endOf('day');
                    this.setEndDate(end);
                }
            } else {
                ed = date;
                var end = date.clone().endOf('day');
                this.setEndDate(end);
                this.activeDate = 'start';
            }
            this.updateView();
        },

        setToday: function(e) {
            e.preventDefault();
            var start_dt = moment().utcOffset(this.timeZone).startOf('day'),
                end_dt = moment().utcOffset(this.timeZone).endOf('day');
            this.setStartDate(start_dt);
            this.setEndDate(end_dt);
            this.updateView();

            //this.clickApply();
        },

        setLastWeek: function(e) {
            e.preventDefault();
            var end_dt = moment().utcOffset(this.timeZone).endOf('day'),
                start_dt = moment().utcOffset(this.timeZone).startOf('week');
            this.setStartDate(start_dt);
            this.setEndDate(end_dt);
            this.updateView();
        },

        setLastMonth: function(e) {
            e.preventDefault();
            var end_dt = moment().utcOffset(this.timeZone).endOf('day'),
                start_dt = moment().utcOffset(this.timeZone).startOf('month');
            this.setStartDate(start_dt);
            this.setEndDate(end_dt);
            this.updateView();
        },

        setLast3Months: function(e) {
            var end_dt =  moment().utcOffset(this.timeZone).endOf('day'),
                start_dt =  moment().utcOffset(this.timeZone).subtract(2, 'months').startOf('month');
            this.setStartDate(start_dt);
            this.setEndDate(end_dt);
            this.updateView();
        },

        clickApply: function(e) {
            this.hide();
            this.element.trigger('apply.garangepicker', this);
        },

        clickCancel: function(e) {
            this.startDate = this.oldStartDate;
            this.endDate = this.oldEndDate;
            this.hide();
            this.element.trigger('cancel.garangepicker', this);
        },

        formInputsChanged: function(e) {
            var isRight = $(e.target).attr('name') == 'garangepicker_end';
            var start = moment(this.container.find('input[name="garangepicker_start"]').val(), this.locale.dateFormat).utcOffset(this.timeZone, true);
            var end = moment(this.container.find('input[name="garangepicker_end"]').val(), this.locale.dateFormat).utcOffset(this.timeZone, true);
            if (!start.isValid()) {
                this.container.find('input[name="garangepicker_start"]').addClass('has_errors');
            } else {
                this.container.find('input[name="garangepicker_start"]').removeClass('has_errors');
            }
            if (!end.isValid()) {
                this.container.find('input[name="garangepicker_end"]').addClass('has_errors');
            } else {
                this.container.find('input[name="garangepicker_end"]').removeClass('has_errors');
            }
            if (start.isValid() && end.isValid()) {

                if (isRight && end.isBefore(start))
                    start = end.clone();


                start = start.startOf('day');
                start.hours(this.container.find('select[name="hour_start"]').val());
                start.minutes(this.container.find('select[name="minute_start"]').val());
                this.setStartDate(start);

                end = end.endOf('day');
                end.hours(this.container.find('select[name="hour_end"]').val());
                end.minutes(this.container.find('select[name="minute_end"]').val());
                this.setEndDate(end);

                if (isRight) {
                    this.container.find('input[name="garangepicker_start"]').val(this.startDate.format(this.locale.dateFormat));
                } else {
                    this.container.find('input[name="garangepicker_end"]').val(this.endDate.format(this.locale.dateFormat));
                }

            }
            this.updateCalendars();
        },

        formInputFocused: function(e) {
            var isRight = $(e.target).attr('name') == 'garangepicker_end';
            if(isRight) {
                this.container.find('input[name="garangepicker_start"]').removeClass('active');
                this.container.find('input[name="garangepicker_end"]').addClass('active');
                this.activeDate = 'end';
            } else {
                this.container.find('input[name="garangepicker_end"]').removeClass('active');
                this.container.find('input[name="garangepicker_start"]').addClass('active');
                this.activeDate = 'start';
            }
        },

        elementChanged: function() {
            if (!this.element.is('input')) return;
            if (!this.element.val().length) return;

            var dateString = this.element.val().split(this.locale.separator),
                start = null,
                end = null;

            if (dateString.length === 2) {
                start = moment(dateString[0], this.locale.format).utcOffset(this.timeZone, true);
                end = moment(dateString[1], this.locale.format).utcOffset(this.timeZone, true);
            }

            if (start === null || end === null) {
                start = moment(this.element.val(), this.locale.format).utcOffset(this.timeZone, true);
                end = start;
            }
            this.setStartDate(start);
            this.setEndDate(end);
            this.updateView();
        },

        keydown: function(e) {
            //hide on tab or enter
            if ((e.keyCode === 9) || (e.keyCode === 13)) {
                this.hide();
            }
        },

        updateElement: function() {
            this.element.val(this.startDate.format(this.locale.format) + this.locale.separator + this.endDate.format(this.locale.format));
            this.element.trigger('change');
        },

        remove: function() {
            this.container.remove();
            this.element.off('.garangepicker');
            this.element.removeData();
        }

    };

    $.fn.garangepicker = function(options, callback) {
        this.each(function() {
            var el = $(this);
            if (el.data('garangepicker'))
                el.data('garangepicker').remove();
            el.data('garangepicker', new GaRangePicker(el, options, callback));
        });
        return this;
    };

}));
