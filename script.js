
const width = 960;
const height = 800;

const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "map");

const projection = d3.geoMercator();
const path = d3.geoPath().projection(projection);

const customColormaps = {
    'Klaus-Werner Iohannis': d3.scaleQuantize().domain([0, 100]).range(['#ffe01a', '#e6c700', '#b39b00', '#806f00', '#4d4200']),
    'Vasilica-Viorica Dancilă': d3.scaleQuantize().domain([0, 100]).range(['#ee2b31', '#d41118', '#a50d13', '#760a0d', '#470608']),
    'Hunor Kelemen': d3.scaleQuantize().domain([0, 100]).range(['#5bbd6b', '#42a452', '#337f40', '#255b2d', '#16371b']),
};

const tooltip = d3.select("#tooltip");

let countyData, uatData;

// Load the county data and the split UAT data files
Promise.all([
    d3.json('geojson/county_fixed_again.geojson'),
    d3.json("geojson/uat_ro_part1.geojson"),
    d3.json("geojson/uat_ro_part2.geojson")
]).then(function (data) {
    countyData = data[0];
    const uatPart1 = data[1];
    const uatPart2 = data[2];

    // Combine the UAT parts into one dataset
    uatData = {
        type: "FeatureCollection",
        features: uatPart1.features.concat(uatPart2.features)
    };

    projection.fitSize([width, height], countyData);
    drawMap(countyData, true);
}).catch(function (error) {
    console.log(error);
});

function drawMap(data, isCounty) {
    svg.selectAll(".county").remove();
    svg.selectAll(".uat").remove();

    svg.selectAll(".county")
        .data(data.features)
        .enter()
        .append("path")
        .attr("class", "county")
        .attr("d", path)
        .attr("fill", d => {
            const party = d.properties.pred_party;
            const percent = d.properties.pred_percent;
            return customColormaps[party] ? customColormaps[party](percent) : 'gray';
        })
        .attr("stroke", "white")
        .attr("stroke-width", 0.8)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .on("click", function (event, d) {
            if (isCounty) zoomToCounty(d);
        });
}

function handleMouseOver(event, d) {
    const party = d.properties.pred_party;
    const percent = d.properties.pred_percent;
    d3.select(this)
        .attr("fill", customColormaps[party] ? d3.color(customColormaps[party](percent)).darker(1) : 'gray');
    tooltip.transition().duration(200).style("opacity", .9);
    tooltip.html(`${d.properties.name}: ${percent}%`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function handleMouseOut(event, d) {
    const party = d.properties.pred_party;
    const percent = d.properties.pred_percent;
    d3.select(this)
        .attr("fill", customColormaps[party] ? customColormaps[party](percent) : 'gray');
    tooltip.transition().duration(500).style("opacity", 0);
}

function zoomToCounty(county) {
    const countyName = county.properties.cleaned_county;
    const uatInCounty = uatData.features.filter(uat => uat.properties.cleaned_county === countyName);

    if (uatInCounty.length > 0) {
        // Adjust the projection to fit the UATs in the selected county
        projection.fitSize([width, height], {
            type: "FeatureCollection",
            features: uatInCounty
        });

        svg.selectAll(".uat").remove();

        svg.selectAll(".uat")
            .data(uatInCounty)
            .enter()
            .append("path")
            .attr("class", "uat")
            .attr("d", path)
            .attr("fill", d => {
                const party = d.properties.pred_party;
                const percent = d.properties.pred_percent;
                return customColormaps[party] ? customColormaps[party](percent) : 'gray';
            })
            .attr("stroke", "white")
            .attr("stroke-width", 0.25)
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut);

        // Keep the county boundaries visible
        svg.selectAll(".county")
            .attr("d", path)
            .attr("fill", d => {
                const party = d.properties.pred_party;
                const percent = d.properties.pred_percent;
                return customColormaps[party] ? customColormaps[party](percent) : 'gray';
            })
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        svg.append("path")
            .datum(county) // Bind the county boundary data
            .attr("d", path)
            .attr("fill", "none") // No fill for the county boundary
            .attr("stroke", "white")
            .attr("stroke-width", 2.5); // Thicker stroke for the boundary
    } else {
        console.log(`No UATs found for county: ${countyName}`);
    }
}

// Double-click to reset the map view
svg.on("dblclick", function () {
    projection.fitSize([width, height], countyData);
    drawMap(countyData, true);
});
