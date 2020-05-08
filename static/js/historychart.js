var CORSURLPrefix, effectiveDate, earliestDate, retrievedGDPFlag;

$(window).load(function() {
    if ($('.se-pre-load').is(':visible')) {
        $('.panel').hide();
    }
});

$(function() {
    var url;
    CORSURLPrefix = 'https://cors-anywhere.herokuapp.com/';
    url = 'https://treasurydirect.gov/NP_WS/debt/current?format=jsonp';
    retrievedGDPFlag = false;
    $.ajax({
        type: 'GET',
        url : CORSURLPrefix + url,
        success: handleGetResponseCurrent,
        dataType: 'text',  // Due to CORS, cannot use datatype jsonp.
        error : function(XMLHttpRequest, textStatus, errorThrown) {
            console.log("Error occured while loading from current."+textStatus);
        }
    });
});

function handleGetResponseCurrent(jsonText) {
    var data, url;
    data = JSON.parse(jsonText.slice(jsonText.indexOf('{'), jsonText.lastIndexOf('}') + 1));
    earliestDate = new Date(Date.UTC(1993, 0, 4));  // Earliest data starts Jan 4, 1993.
    effectiveDate = new Date(data.effectiveDate);
    url = 'https://treasurydirect.gov/NP/debt/search?startMonth=' + (earliestDate.getUTCMonth() + 1) + '&startDay=' + earliestDate.getUTCDate() + '&startYear=' + earliestDate.getUTCFullYear() + '&endMonth=' + (effectiveDate.getUTCMonth() + 1) + '&endDay=' + effectiveDate.getUTCDate() + '&endYear=' + effectiveDate.getUTCFullYear();
    $('#currentDebtAmount').empty();
    $('#currentDebtAmount').append(' Current Total Public Debt (As-of: '+ formatDateUTC(effectiveDate) +' UTC): ' + (data.totalDebt).toLocaleString('en-US', {style: 'currency', currency: 'USD'}));
    $.get(CORSURLPrefix + url, handleGetResponseHistory);
}

function handleGetResponseHistory(data) {
    var historyData, html;
    historyData = [];
    html = $.parseHTML(data.replace(/<img[^>]+>/gi, ''));
    $('table.data1 tr:gt(0)', html).each(function(index, row) {
        historyData.push([Date.parse($('td:eq(0)', row).text()), Number($('td:eq(3)', row).text().replace(/\,/g, ''))]);
    });
    $('.se-pre-load').hide();
    $('.panel').delay(1500).show();
    initiateChart(historyData);
}

function handleGetJSONResponseGDPAPI(evt, data) {
    var firstFlag = true, last_amount = null;
    $.each(data['dataset'], function (index, value) {
        var nextDate = new Date(Date.parse(value['date']));
        if (nextDate >= earliestDate) {
            if (firstFlag) {
                if (!last_amount) {
                    last_amount = value['amount'];
                }
                evt.addPoint([earliestDate.getTime(), last_amount], false);
                firstFlag = false;
            }
            // Add point that is either ending point for previous value or if first time, starting point for first value.
            evt.addPoint([nextDate.getTime(), last_amount], false);
            // Add point to start line for current value.
            evt.addPoint([nextDate.getTime(), value['amount']], false);
            // Zoom out full.
            evt.chart.xAxis[0].setExtremes(earliestDate.getTime(), effectiveDate.getTime());
        }
        last_amount = value['amount'];
    });
    // Add a point to close the line for the latest value.
    if (!firstFlag) {
        evt.addPoint([effectiveDate.getTime(), last_amount], false);
    }
    evt.show();
    evt.chart.redraw();
    retrievedGDPFlag = true;
}

function onLegendItemClick() {
    var url, LegendItemClickEvent;
    url = 'https://debttothepenny.com/api/v1.0/gdp';
    LegendItemClickEvent = this;
    if (!retrievedGDPFlag) {
        $('.panel').hide();
        $('.se-pre-load').show();
        $.getJSON(url,
            function (data) {
                handleGetJSONResponseGDPAPI(LegendItemClickEvent, data);
            })
            .fail(function () {
                // TODO: Notify user that GDP not accessible.
            })
            .always(function () {
                $('.se-pre-load').hide();
                $('.panel').delay(1500).show();
            });
    }
}

// Chart
function initiateChart(historyData) {
    Highcharts.setOptions({
        lang: {
            decimalPoint: '.',
            thousandsSep: ','
        }
    });
    $('#mainChart').highcharts('StockChart', {
        title: {
            text: 'U.S. National Public Debt'
        },
        xAxis: {
            type: 'datetime',
            ordinal: false,
            title: {
                text: 'Date'
            }
        },
        yAxis: {
            title: {
                text: 'Amount (Trillions)'
            },
            labels: {
                formatter: function () {
                    return '$' + (this.value / Math.pow(10, 12)).toFixed(1) + 'T';
                }
            }
        },
        series: [{
            name: 'Public Debt',
            type: 'area',
            data: historyData,
            threshold: null,
            fillColor: {
                linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                },
                stops: [
                    [0, Highcharts.getOptions().colors[0]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                ]
            }
        }, {
            name: 'GDP',
            type: 'line',
            data: [],
            color: Highcharts.getOptions().colors[2],
            lineWidth: 3,
            marker: {
                enabled: true,
                radius: 4
            },
            events: {
                legendItemClick: onLegendItemClick
            },
            visible: false
        }],
        credits: {
            enabled: false
        },
        rangeSelector: {
            selected: 4
        },
        tooltip: {
            headerFormat: '<span>{point.x:%b %d, %Y}</span><br/>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>${point.y:,.2f} USD</b><br/>',
            split: true
        },
        legend: {
            enabled: true,
            layout: 'horizontal',
            verticalAlign: 'center',
            align: 'left',
            x: 60,
            y: 74,
            borderColor: '#C98657',
            borderWidth: 1,
            floating: true
        }
    });
}

function formatDateUTC(date) {
    var day, monthIndex, year, monthNames;
    monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'
    ];
    day = date.getUTCDate();
    monthIndex = date.getUTCMonth();
    year = date.getUTCFullYear();
    return (monthNames[monthIndex].slice(0, 3) + ' ' + day + ', ' +  year);
}
