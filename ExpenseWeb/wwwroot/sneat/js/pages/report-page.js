document.addEventListener("DOMContentLoaded", function () {

    // LINE CHART
    new ApexCharts(document.querySelector("#reportLineChart"), {
        series: [
            { name: "Thu", data: [12, 15, 18, 20, 22, 21] },
            { name: "Chi", data: [5, 7, 8, 10, 9, 11] }
        ],
        chart: {
            type: "area",
            height: 320,
            toolbar: { show: false }
        },
        colors: ["#28c76f", "#ff3e1d"],
        stroke: { curve: "smooth" },
        xaxis: {
            categories: ["T1", "T2", "T3", "T4", "T5", "T6"]
        }
    }).render();

    // DONUT
    new ApexCharts(document.querySelector("#reportDonutChart"), {
        series: [34, 24, 18, 14, 10],
        labels: ["Mua sắm", "Ăn uống", "Hóa đơn", "Di chuyển", "Khác"],
        chart: {
            type: "donut",
            height: 260
        },
        colors: ["#8c57ff", "#ffab00", "#ff3e1d", "#03c3ec", "#8592a3"]
    }).render();

    // BAR
    new ApexCharts(document.querySelector("#reportBarChart"), {
        series: [{
            name: "Chi tiêu",
            data: [1250, 600, 300, 200, 150]
        }],
        chart: {
            type: "bar",
            height: 320,
            toolbar: { show: false }
        },
        colors: ["#696cff"],
        xaxis: {
            categories: ["Mua sắm", "Ăn uống", "Hóa đơn", "Di chuyển", "Khác"]
        }
    }).render();

});