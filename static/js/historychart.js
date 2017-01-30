var CORSURLPrefix;

$(window).load(function() {
    if ($('.se-pre-load').is(':visible')) {
        $('.panel').hide();
    }
});

$(function() {
    var url;
    CORSURLPrefix = 'https://cors-anywhere.herokuapp.com/';
    url = 'https://treasurydirect.gov/NP/debt/current';
    $.get(CORSURLPrefix + url, handleGetResponseCurrent);
});

function handleGetResponseCurrent(data) {
    var html, url, effectiveDate, earliestDate;
    html = $.parseHTML(data.replace(/<img[^>]+>/gi, ''));
    earliestDate = new Date(Date.UTC(1993, 0, 4));  // Earliest data starts Jan 4, 1993.
    effectiveDate = new Date(Date.parse($('table.data1 tr:eq(1) td:eq(0)', html).text()));
    url = 'https://treasurydirect.gov/NP/debt/search?startMonth=' + (earliestDate.getUTCMonth() + 1) + '&startDay=' + earliestDate.getUTCDate() + '&startYear=' + earliestDate.getUTCFullYear() + '&endMonth=' + (effectiveDate.getUTCMonth() + 1) + '&endDay=' + effectiveDate.getUTCDate() + '&endYear=' + effectiveDate.getUTCFullYear();
    $('#currentDebtAmount').empty();
    $('#currentDebtAmount').append(' Current Total Public Debt (As-of: '+ formatDateUTC(effectiveDate) +'): $' + $('table.data1 tr:eq(1) td:eq(3)', html).text());
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
        }],
        credits: {
            enabled: false
        },
        rangeSelector: {
            selected: 4
        },
        tooltip: {
            headerFormat: '<span>{point.x:%b %d, %Y}</span><br/>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>${point.y:,.2f} USD</b><br/>'
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
