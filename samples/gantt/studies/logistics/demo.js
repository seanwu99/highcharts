var today = +Date.now(),
    minutes = 60 * 1000,
    hours = 60 * minutes,
    days = 24 * hours;

var information = {
    events: {
        loading: {
            color: '#395627'
        },
        ladenVoyage: {
            color: '#558139'
        },
        unloading: {
            color: '#aad091'
        },
        ballastVoyage: {
            color: '#c6dfb6'
        }
    },
    vessels: [{
        name: 'Vessel 1',
        utilized: 95,
        idle: 10,
        trips: [{
            name: 'Contract 1',
            startPort: 'USGLS',
            midPort: 'BEZEE',
            endPort: 'USCP6',
            start: today + days,
            loading: 1 * days + 2 * hours + 45 * minutes,
            ladenVoyage: 21 * days,
            unloading: 1 * days + 5 * hours,
            ballastVoyage: 14 * days
        }, {
            name: 'Contract 2',
            startPort: 'USGLS',
            midPort: 'BEZEE',
            endPort: 'USCP6',
            start: today + 50 * days,
            loading: 2 * days,
            ladenVoyage: 10 * days,
            unloading: 1 * days,
            ballastVoyage: 5 * days
        }, {
            name: 'Contract 5',
            startPort: 'USGLS',
            midPort: 'BEZEE',
            endPort: 'USCP6',
            start: today + 75 * days,
            loading: 1 * days + 2 * hours + 45 * minutes,
            ladenVoyage: 21 * days,
            unloading: 1 * days + 5 * hours,
            ballastVoyage: 14 * days
        }]
    }, {
        name: 'Vessel 2',
        utilized: 75,
        idle: 23,
        trips: [{
            name: 'Contract 3',
            startPort: 'USGLS',
            midPort: 'BEZEE',
            endPort: 'USCP6',
            start: today - 5 * days,
            loading: 1 * days + 2 * hours + 45 * minutes,
            ladenVoyage: 21 * days,
            unloading: 1 * days + 5 * hours,
            ballastVoyage: 14 * days
        }, {
            name: 'Contract 4',
            startPort: 'USGLS',
            midPort: 'BEZEE',
            endPort: 'USCP6',
            start: today + 45 * days,
            loading: 2 * days,
            ladenVoyage: 10 * days,
            unloading: 1 * days,
            ballastVoyage: 5 * days
        }]
    }]
};
var find = Highcharts.find,
    dragGuideBox = {
        default: {
            'stroke-width': 1,
            'stroke-dasharray': '5, 5',
            stroke: '#888',
            fill: 'rgba(0, 0, 0, 0.1)',
            zIndex: 900
        },
        error: {
            fill: 'rgba(255, 0, 0, 0.2)'
        }
    };

/**
 * NB! Copied from modules/wordcloud.src.js
 * isRectanglesIntersecting - Detects if there is a collision between two
 *     rectangles.
 *
 * @param  {object} r1 First rectangle.
 * @param  {object} r2 Second rectangle.
 * @return {boolean} Returns true if the rectangles overlap.
 */
var isRectanglesIntersecting = function isRectanglesIntersecting(r1, r2) {
    return !(
        r2.left > r1.right ||
        r2.right < r1.left ||
        r2.top > r1.bottom ||
        r2.bottom < r1.top
    );
};

/**
 * Collision detection.
 * @param {Object} point The positions of the new point.
 * @param {Object} chart The chart if there is a collision.
 * @returns {Boolean} Returns true if the point is colliding.
 */
var isColliding = function (point, chart) {
    var r1 = {
            left: point.start,
            right: point.end,
            top: point.y,
            bottom: point.y
        },
        // Only check for collision with points lying on the same series as the
        // new point.
        series = find(chart.series, function (series) {
            return series.index === point.y;
        }),
        data = series && series.data || [];
    return !!find(data, function (p) {
        var r2 = {
            left: p.start,
            right: p.end,
            top: p.y,
            bottom: p.y
        };

        return p.trip === point.trip ? false : isRectanglesIntersecting(r1, r2);
    });
};

// --- Drag/drop functionality ----

Highcharts.Chart.prototype.callbacks.push(function (chart) {
    var addEvent = Highcharts.addEvent,
        container = chart.container;

    function mouseDown() {
        var guideWidth,
            guideX = Infinity,
            group = {
                start: Number.MAX_SAFE_INTEGER,
                end: Number.MIN_SAFE_INTEGER,
                y: 0
            },
            bBox;

        if (chart.hoverPoint) {
            // Store point to move
            chart.dragPoint = chart.hoverPoint;
            group.y = chart.dragPoint.y;

            // Draw guide box
            bBox = chart.dragPoint.graphic.getBBox();
            guideWidth = chart.dragPoint.series.points.reduce(
                function (acc, cur) {
                    var bb;
                    if (cur.trip === chart.dragPoint.trip) {
                        bb = cur.graphic.getBBox();
                        guideX = Math.min(guideX, bb.x);
                        acc += bb.width;
                        // Collect start and end of group.
                        group.start = Math.min(cur.start, group.start);
                        group.end = Math.max(cur.end, group.end);
                    }
                    return acc;
                }, 0
            );
            chart.dragPoint.group = group;

            chart.dragGuideBox = chart.renderer.rect(
                chart.plotLeft + guideX,
                chart.plotTop + bBox.y,
                guideWidth,
                bBox.height
            ).attr(dragGuideBox.default).add();
        }
    }

    function mouseMove(e) {
        var dragPoint = chart.dragPoint,
            group = dragPoint && dragPoint.group,
            xAxis,
            yAxis,
            xDelta,
            isDragPointColliding,
            deltaX,
            deltaY;
        if (dragPoint) {
            xAxis = dragPoint.series.xAxis;
            yAxis = dragPoint.series.yAxis;
            // No tooltip while dragging
            e.preventDefault();

            // Update new positions
            dragPoint.dragPageX = dragPoint.dragPageX || e.pageX;
            dragPoint.dragPageY = dragPoint.dragPageY || e.pageY;
            deltaX = e.pageX - dragPoint.dragPageX;
            deltaY = e.pageY - dragPoint.dragPageY;
            dragPoint.newX = Math.round(xAxis.toValue(
                dragPoint.plotX + deltaX, true
            ));
            dragPoint.newY = Math.round(yAxis.toValue(
                dragPoint.plotY + deltaY, true
            ));
            xDelta = dragPoint.newX - dragPoint.start;

            // Check if the new position of the dragged point is colliding.
            dragPoint.isColliding =
            isDragPointColliding = isColliding({
                start: group.start + xDelta,
                end: group.end + xDelta,
                y: dragPoint.newY,
                trip: dragPoint.trip
            }, chart);

            // Move guide box
            chart.dragGuideBox
                .translate(deltaX, deltaY)
                .attr(
                    isDragPointColliding ?
                    dragGuideBox.error :
                    dragGuideBox.default
                );
        }
    }

    function drop() {
        var newSeries,
            newPoints,
            deltaX,
            dragPoint = chart.dragPoint,
            reset = function () {
                // Remove guide box
                if (chart.dragGuideBox) {
                    chart.dragGuideBox.destroy();
                    delete chart.dragGuideBox;
                }
                // Remove stored dragging references on point in case we update
                // instead of replacing.
                if (dragPoint) {
                    delete dragPoint.dragPageX;
                    delete dragPoint.dragPageY;
                    delete dragPoint.newX;
                    delete dragPoint.newY;
                }
                // Remove chart reference to current dragging point
                delete chart.dragPoint;
            };

        if (
            dragPoint &&
            dragPoint.newX !== undefined &&
            dragPoint.newY !== undefined &&
            !dragPoint.isColliding
        ) {
            // Find series the points should belong to.
            // Series have y value as ID, making it easy to map between them.
            newSeries = chart.get(dragPoint.newY);
            if (!newSeries) {
                reset();
                return;
            }

            // Define the new points
            deltaX = dragPoint.newX - dragPoint.start;
            newPoints = dragPoint.series.points.reduce(function (acc, cur) {
                var point;
                // Only add points from the same series with the same trip name
                if (cur.trip === dragPoint.trip) {
                    point = {
                        start: cur.start + deltaX,
                        end: cur.end + deltaX,
                        y: dragPoint.newY,
                        oldPoint: cur
                    };
                    // Copy over data from old point
                    [
                        'color', 'vessel', 'trip', 'type', 'startPort',
                        'endPort', 'name'
                    ].forEach(function (prop) {
                        point[prop] = cur[prop];
                    });
                    acc.push(point);
                }
                return acc;
            }, []);

            // Update the point
            if (newSeries !== dragPoint.series) {
                newPoints.forEach(function (newPoint) {
                    newPoint.oldPoint.remove(false);
                    delete newPoint.oldPoint;
                    newSeries.addPoint(newPoint);
                });
            } else {
                // Use point.update if series is the same
                newPoints.forEach(function (newPoint) {
                    var old = newPoint.oldPoint;
                    delete newPoint.oldPoint;
                    old.update(newPoint);
                });
            }
        }

        // Always reset on mouseup
        reset();
    }

    // Add events
    addEvent(container, 'mousedown', mouseDown);
    addEvent(container, 'mousemove', mouseMove);
    addEvent(document, 'mouseup', drop);
    addEvent(container, 'mouseleave', drop);
});

// ---- end drag/drop ----

var getPointsFromTrip = function (trip, groups, vessel, y) {
    var start = trip.start,
        events = Object.keys(groups);
    return events.reduce(function (points, key) {
        var group = groups[key],
            duration = trip[key],
            end = start + duration,
            startPort = key === 'ladenVoyage' ?
                trip.startPort : (
                    key === 'ballastVoyage' ? trip.midPort : null
                ),
            endPort = key === 'ladenVoyage' ?
                trip.midPort : (
                    key === 'ballastVoyage' ? trip.endPort : null
                ),
            point = {
                start: start,
                end: end,
                color: group.color,
                vessel: vessel.name,
                trip: trip.name,
                y: y,
                type: key,
                startPort: startPort,
                endPort: endPort,
                name: trip.name
            };
        // Update start for the next iteration
        start = end;

        // Add the point
        points.push(point);
        return points;
    }, []);
};

var getSeriesFromInformation = function (info) {
    var events = info.events,
        vessels = info.vessels;
    return vessels.reduce(function (series, vessel, i) {
        var data = [];

        vessel.trips.forEach(function (trip) {
            var points = getPointsFromTrip(trip, events, vessel, i);
            data = data.concat(points);
        });

        series.push({
            name: vessel.name,
            data: data,
            id: i
        });
        return series;
    }, []);
};

var getCategoriesFromInformation = function (information) {
    var vessels = information.vessels;
    return vessels.map(function (vessel) {
        var idle = vessel.idle,
            utilized = vessel.utilized,
            className = utilized > 75 ? 'ok' : 'warn';
        return [
            '<span class="info-span ' + className + '">',
            '    <span class="utilized">' + utilized + '%</span><br/>',
            '    <span>t: ' + idle + ' days</span>',
            '</span>'
        ].join('\n');
    });
};

var leftLabelFormat = function () {
    if (this.point.type === 'ladenVoyage' || this.point.type === 'ballastVoyage') {
        return this.point.startPort;
    }
};

var centerLabelFormat = function () {
    if (this.point.type === 'ladenVoyage') {
        return ' ' + this.point.name + ' ';
    }
};

var rightLabelFormat = function () {
    if (this.point.type === 'ladenVoyage' || this.point.type === 'ballastVoyage') {
        return this.point.endPort;
    }
};

var onSeriesClick = function (event) {
    var el = document.getElementById('tooltip-info'),
        point = event.point,
        vessel = information.vessels.find(function (vessel) {
            return vessel.name === point.vessel;
        }),
        trip = vessel.trips.find(function (trip) {
            return trip.name === point.trip;
        });
    el.innerHTML = [
        '<p>Vessel: ' + vessel.name + '</p>',
        'Start: ' + Highcharts.dateFormat(trip.start)
    ].join('');
};

var xAxisMin = today - (10 * days),
    xAxisMax = xAxisMin + 90 * days;

Highcharts.ganttChart('container', {
    plotOptions: {
        series: {
            events: {
                click: onSeriesClick
            },
            cursor: 'pointer',
            borderRadius: 0,
            borderWidth: 0,
            pointPadding: 0,
            dataLabels: [{
                enabled: true,
                labelrank: 1,
                formatter: leftLabelFormat,
                align: 'left',
                style: {
                    fontSize: '8px'
                }
            }, {
                enabled: true,
                labelrank: 2,
                formatter: centerLabelFormat,
                align: 'center',
                borderWidth: 1,
                padding: 3,
                style: {
                    fontSize: '10px'
                }
            }, {
                enabled: true,
                labelrank: 1,
                formatter: rightLabelFormat,
                align: 'right',
                style: {
                    fontSize: '8px'
                }
            }]
        }
    },
    legend: {
        enabled: false
    },
    rangeSelector: {
        enabled: true,
        selected: 1
    },
    scrollbar: {
        enabled: true
    },
    series: getSeriesFromInformation(information),
    tooltip: {
        enabled: false
    },
    xAxis: [{
        type: 'datetime',
        currentDateIndicator: true,
        grid: false,
        labels: {
            format: undefined
        },
        min: xAxisMin,
        max: xAxisMax,
        tickInterval: undefined
    }],
    yAxis: [{
        type: 'grid',
        maxPadding: 0,
        staticScale: 100,
        labels: {
            useHTML: true
        },
        grid: {
            columns: [{
                categories: ['Vessel 1', 'Vessel 2']
            }, {
                categories: getCategoriesFromInformation(information)
            }]
        }
    }]
});