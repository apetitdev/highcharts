import H from '../../parts/Globals.js';

var Chart = H.Chart,
    addEvent = H.addEvent;

H.dragNodesMixin = {
    /**
     * Mouse down action, initializing drag&drop mode.
     *
     * @param {global.Event} event Browser event, before normalization.
     * @param {Highcharts.Point} point The point that event occured.
     */
    onMouseDown: function (point, event) {
        var normalizedEvent = this.chart.pointer.normalize(event);

        point.fixedPosition = {
            chartX: normalizedEvent.chartX,
            chartY: normalizedEvent.chartY,
            plotX: point.plotX,
            plotY: point.plotY
        };

        point.inDragMode = true;
    },
    /**
     * Mouse move action during drag&drop.
     *
     * @param {global.Event} event Browser event, before normalization.
     * @param {Highcharts.Point} point The point that event occured.
     */
    onMouseMove: function (point, event) {
        if (point.fixedPosition && point.inDragMode) {
            var series = this,
                chart = series.chart,
                normalizedEvent = chart.pointer.normalize(event),
                diffX = point.fixedPosition.chartX - normalizedEvent.chartX,
                diffY = point.fixedPosition.chartY - normalizedEvent.chartY,
                newPlotX,
                newPlotY;

            // At least 5px to apply change (avoids simple click):
            if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
                newPlotX = point.fixedPosition.plotX - diffX;
                newPlotY = point.fixedPosition.plotY - diffY;

                if (chart.isInsidePlot(newPlotX, newPlotY)) {
                    point.plotX = newPlotX;
                    point.plotY = newPlotY;

                    this.redrawHalo(point);

                    if (!series.layout.simulation) {
                        // Start new simulation:
                        if (!series.layout.enableSimulation) {
                            // Run only one iteration to speed things up:
                            series.layout.setMaxIterations(1);
                        }
                        // When dragging nodes, we don't need to calculate
                        // initial positions and rendering nodes:
                        series.layout.setInitialRendering(false);
                        series.layout.run();
                        // Restore defaults:
                        series.layout.setInitialRendering(true);
                    } else {
                        // Extend current simulation:
                        series.layout.resetSimulation();
                    }
                }
            }
        }
    },
    /**
     * Mouse up action, finalizing drag&drop.
     *
     * @param {Highcharts.Point} point The point that event occured.
     */
    onMouseUp: function (point) {
        if (point.fixedPosition) {
            this.layout.run();
            point.inDragMode = false;
            if (!this.options.fixedDraggable) {
                delete point.fixedPosition;
            }
        }
    },
    // Draggable mode:
    /**
     * Redraw halo on mousemove during the drag&drop action.
     *
     * @param {Highcharts.Point} point The point that should show halo.
     */
    redrawHalo: function (point) {
        if (point && this.halo) {
            this.halo.attr({
                d: point.haloPath(
                    this.options.states.hover.halo.size
                )
            });
        }
    }
};
/*
 * Draggable mode:
 */
addEvent(
    Chart,
    'load',
    function () {
        var chart = this,
            mousedownUnbinder,
            mousemoveUnbinder,
            mouseupUnbinder;

        if (chart.container) {
            mousedownUnbinder = addEvent(
                chart.container,
                'mousedown',
                function (event) {
                    var point = chart.hoverPoint;
                    if (
                        point &&
                        point.series &&
                        point.series.hasDraggableNodes &&
                        point.series.options.draggable
                    ) {
                        point.series.onMouseDown(point, event);
                        mousemoveUnbinder = addEvent(
                            chart.container,
                            'mousemove',
                            function (e) {
                                return point &&
                                    point.series &&
                                    point.series.onMouseMove(point, e);
                            }
                        );
                        mouseupUnbinder = addEvent(
                            chart.container.ownerDocument,
                            'mouseup',
                            function (e) {
                                mousemoveUnbinder();
                                mouseupUnbinder();
                                return point &&
                                    point.series &&
                                    point.series.onMouseUp(point, e);
                            }
                        );
                    }
                }
            );
        }

        addEvent(chart, 'destroy', function () {
            mousedownUnbinder();
        });
    }
);
