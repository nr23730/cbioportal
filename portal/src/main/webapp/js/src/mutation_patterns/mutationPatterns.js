/*
 * Copyright (c) 2015 Memorial Sloan-Kettering Cancer Center.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS
 * FOR A PARTICULAR PURPOSE. The software and documentation provided hereunder
 * is on an "as is" basis, and Memorial Sloan-Kettering Cancer Center has no
 * obligations to provide maintenance, support, updates, enhancements or
 * modifications. In no event shall Memorial Sloan-Kettering Cancer Center be
 * liable to any party for direct, indirect, special, incidental or
 * consequential damages, including lost profits, arising out of the use of this
 * software and its documentation, even if Memorial Sloan-Kettering Cancer
 * Center has been advised of the possibility of such damage.
 */

/*
 * This file is part of cBioPortal.
 *
 * cBioPortal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 *
 *
 * Copied from co-expression for testing mutation patterns
 *
 * @author: unberath
 * @date: April 2018
 *
 */

var MutPatView = (function() {

    //Pre settings for every sub tab instance
    var Prefix = {
            divPrefix: "mutpat_",
            loadingImgPrefix: "mutpat_loading_img_",
            tableDivPrefix: "mutpat_table_div_",
            tablePrefix: "mutpat_table_",
            plotPrefix: "mutpat_plot_"
        },
        dim = {
            mutpat_table_width: "500px",
            mutpat_tables_width: "1120px",
            mutpat_plots_width: "1120px",
            mutpat_plots_height: "200px"
        },
        has_mutation_data = false;
    //Containers    
    var profileList = []; //Profile Lists for all queried genes
    var groupsList = [{"ID":1, "NAME":"1"}, {"ID":2, "NAME":"2"}, {"ID":5, "NAME":"5"}, {"ID":10, "NAME":"10"}, {"ID":0, "NAME":"Use Z-Scores"}]; //Groups Lists for all queried genes

    //Sub tabs
    var Tabs = (function() {

        function appendTabsContent() {
            $.each(window.QuerySession.getQueryGenes(), function(index, value) {
                $("#mutpat-tabs-list").append("<li><a href='#" + Prefix.divPrefix + cbio.util.safeProperty(value) + 
                  "' class='mutpat-tabs-ref'><span>" + value + "</span></a></li>");
            });
        }

        function appendLoadingImgs() {
            $.each(window.QuerySession.getQueryGenes(), function(index, value) {
                $("#mutpat-tabs-content").append("<div id='" + Prefix.divPrefix + cbio.util.safeProperty(value) + "'>" +
                    "<div id='" + Prefix.loadingImgPrefix + cbio.util.safeProperty(value) + "'>" +
                    "<table><tr><td><img style='padding:20px;' src='images/ajax-loader.gif' alt='loading' /></td>" +
                    "<td>Calculating and rendering... (this may take up to 1 minute)</td></tr></table>" +
                    "</div></div>");
            });
        }

        function generateTabs() {
            $("#mutpat-tabs").tabs();
            $("#mutpat-tabs").tabs('paging', {tabsPerPage: 10, follow: true, cycle: false});
            $("#mutpat-tabs").tabs("option", "active", 0);
            $(window).trigger("resize");
        }

        function bindListenerToTabs() {
            $("#mutpat-tabs").on("tabsactivate", function(event, ui) {
                var _gene = ui.newTab.text();
                var mutPatSubTabView = new MutPatSubTabView();
                mutPatSubTabView.init(_gene);
            });
        }

        return {
            appendTabsContent: appendTabsContent,
            appendLoadingImgs: appendLoadingImgs,
            generateTabs: generateTabs,
            bindListenerToTabs: bindListenerToTabs
        };

    }());

    var ProfileSelector = (function() {

        function filterProfiles(_profileList) {
            $.each(_profileList, function(i, obj) {
                if (obj["GENETIC_ALTERATION_TYPE"] === "MRNA_EXPRESSION" || obj["GENETIC_ALTERATION_TYPE"] === "PROTEIN_LEVEL") {
                    // if (obj["STABLE_ID"].toLowerCase().indexOf("zscores") !== -1) {
                    //     if (obj["STABLE_ID"].toLowerCase().indexOf("merged_median_zscores") !== -1) {
                    //         profileList.push(obj);
                    //     }
                    // } else {
                        profileList.push(obj);
                    // }
                } else if (obj["GENETIC_ALTERATION_TYPE"] === "MUTATION_EXTENDED") {
                    has_mutation_data = true;
                }
            });
            //swap the rna seq profile to the top
            $.each(profileList, function(i, obj) {
                if (obj["STABLE_ID"].toLowerCase().indexOf("rna_seq") !== -1) {
                    cbio.util.swapElement(profileList, i, 0);
                }
            });
        }

        function drawProfileSelector() {
            $("#mutpat-profile-selector-dropdown").append(
                "Data Set " + 
                "<select id='mutpat-profile-selector'></select>");
            $.each(profileList, function(index, value) {
                $("#mutpat-profile-selector").append(
                    "<option value='" + value["STABLE_ID"] + "'>" +
                    value["NAME"] + "</option>"
                );            
            });
        }

        function bindListener() {
            $("#mutpat-profile-selector").change(function() {
                var geneIds = window.QuerySession.getQueryGenes();
                $.each(geneIds, function(index, value) {
                    //Distroy all the subview instances
                    var element =  document.getElementById(Prefix.tableDivPrefix + cbio.util.safeProperty(value));
                    if (typeof(element) !== 'undefined' && element !== null) { 
                        element.parentNode.removeChild(element); //destroy all the existing instances
                    }
                    // element =  document.getElementById(Prefix.plotPrefix + cbio.util.safeProperty(value));
                    // if (typeof(element) !== 'undefined' && element !== null) { 
                    //     element.parentNode.removeChild(element); //destroy all the existing instances
                    // }   
                    //Empty all the sub divs
                    $("#" + Prefix.tableDivPrefix + cbio.util.safeProperty(value)).empty();
                    // $("#" + Prefix.plotsPreFix + cbio.util.safeProperty(value)).empty();
                    $("#" + Prefix.loadingImgPrefix + cbio.util.safeProperty(value)).empty();
                    //Add back loading imgs
                    $("#" + Prefix.loadingImgPrefix + cbio.util.safeProperty(value)).append(
                        "<table><tr><td><img style='padding:20px;' src='images/ajax-loader.gif' alt='loading' /></td>" +
                        "<td>Calculating and rendering may take up to 1 minute.</td></tr></table>" +
                        "</div>");
                });
                //Re-draw the currently selected sub-tab view
                var curTabIndex = $("#mutpat-tabs").tabs("option", "active");
                var mutPatSubTabView = new MutPatSubTabView();
                mutPatSubTabView.init(geneIds[curTabIndex]);
            });
        }

        return {
            init: function(_profileList) {
                filterProfiles(_profileList);
                drawProfileSelector();
                bindListener();
            }
        };

    }()); //Closing Profile Selector

    var GroupsSelector = (function() {

        
        function drawGroupsSelector() {
            $("#mutpat-groups-selector-dropdown").append(
                "Groups " +
                "<select id='mutpat-groups-selector'></select>");
            $.each(groupsList, function(index, value) {
                $("#mutpat-groups-selector").append(
                    "<option value='" + value["ID"] + "'>" +
                    value["NAME"] + "</option>"
                );
            });
        }

        function bindListener() {
            $("#mutpat-groups-selector").change(function() {
                var geneIds = window.QuerySession.getQueryGenes();
                $.each(geneIds, function(index, value) {
                    //Distroy all the subview instances
                    var element =  document.getElementById(Prefix.tableDivPrefix + cbio.util.safeProperty(value));
                    if (typeof(element) !== 'undefined' && element !== null) {
                        element.parentNode.removeChild(element); //destroy all the existing instances
                    }
                    // element =  document.getElementById(Prefix.plotPrefix + cbio.util.safeProperty(value));
                    // if (typeof(element) !== 'undefined' && element !== null) { 
                    //     element.parentNode.removeChild(element); //destroy all the existing instances
                    // }   
                    //Empty all the sub divs
                    $("#" + Prefix.tableDivPrefix + cbio.util.safeProperty(value)).empty();
                    // $("#" + Prefix.plotsPreFix + cbio.util.safeProperty(value)).empty();
                    $("#" + Prefix.loadingImgPrefix + cbio.util.safeProperty(value)).empty();
                    //Add back loading imgs
                    $("#" + Prefix.loadingImgPrefix + cbio.util.safeProperty(value)).append(
                        "<table><tr><td><img style='padding:20px;' src='images/ajax-loader.gif' alt='loading' /></td>" +
                        "<td>Calculating and rendering may take up to 1 minute.</td></tr></table>" +
                        "</div>");
                });
                //Re-draw the currently selected sub-tab view
                var curTabIndex = $("#mutpat-tabs").tabs("option", "active");
                var mutPatSubTabView = new MutPatSubTabView();
                mutPatSubTabView.init(geneIds[curTabIndex]);
            });
        }

        return {
            init: function() {
                drawGroupsSelector();
                bindListener();
            }
        };

    }()); //Closing Groups Selector

    //Instance of each sub tab
    var MutPatSubTabView = function() {

        var Names = {
                divId: "", //Id for the div of the single query gene (both mutpat table and plot)
                loadingImgId: "", //Id for ajax loading img
                tableId: "", //Id for the co-expression table
                tableDivId: "", //Id for the div of the co-expression table
                plotsId: "" //Id for the plots on the right
            },
            geneId = "", //Gene of this sub tab instance
            mutpatTableArr = [], //Data array for the datatable
            mutPatTableInstance = "";

        var MutPatTable = function(position) {

            function configTable() {
                //Draw out the markdown of the datatable
                $("#" + Names.tableId + position).append(
                    "<thead style='font-size:70%;' >" +
                    "<tr>" + 
                    "<th>Pattern</th>" +
                    "<th>Magnitude</th>" +
                    "<th>Support</th>" +
                    "</tr>" +
                    "</thead><tbody></tbody>"
                );

                //Configure the datatable with  jquery
                mutPatTableInstance = $("#" + Names.tableId + position).dataTable({
                    "sDom": '<"H"f<"mutpat-table-filter-magnitude">>t<"F"i<"datatable-paging"p>>',
                    "bPaginate": true,
                    "sPaginationType": "two_button",
                    "bInfo": true,
                    "bJQueryUI": true,
                    "bAutoWidth": false,
                    "aaData" : mutpatTableArr,
                    "aaSorting": [[1, 'desc']],
                    "aoColumnDefs": [
                        {
                            "bSearchable": true,
                            "aTargets": [ 0 ],
                            "sWidth": "56%"
                        },
                        {
                            "sType": 'mutpat-absolute-value',
                            "bSearchable": false,
                            "aTargets": [ 1 ],
                            "sWidth": "22%"
                        },
                        // {
                        //     "sType": 'mutpat-absolute-value',
                        //     //TODO: should be disabled; this is just a quick fix, otherwise the fnfilter would work on this column
                        //     //"bSearchable": false, 
                        //     "bSearchable": true, 
                        //     "aTargets": [ 2 ],
                        //     "sWidth": "22%"
                        // },
                        {
                            "sType": 'mutpat-absolute-value',
                            "bSearchable": false,
                            "aTargets": [ 2 ],
                            "sWidth": "22%"
                        }
                    ],
                    "sScrollY": "600px",
                    "bScrollCollapse": true,
                    //iDisplayLength: mutpat_table_arr.length,
                    "oLanguage": {
                        "sSearch": "Search Gene"
                    },
                    "bDeferRender": true,
                    "iDisplayLength": 30,
                    "fnRowCallback": function(nRow, aData) {
                        $('td:eq(0)', nRow).css("font-weight", "bold");
                        $('td:eq(1)', nRow).css("font-weight", "bold");
                        $('td:eq(2)', nRow).css("font-weight", "bold");
                        if (aData[2] > 0.5) {
                            $('td:eq(2)', nRow).css("color", "#3B7C3B");
                        } else {
                            $('td:eq(2)', nRow).css("color", "#B40404");
                        }
                    },
                    "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {
                        if (iTotal === iMax) {
                            return iStart +" to "+ iEnd + " of " + iTotal;
                        } else {
                            return iStart + " to " + iEnd + " of " + iTotal + " (filtered from " + iMax + " total)";
                        }
                    }
                });  
            }

            function attachDownloadFullResultButton() {
                //Append download full result button at the bottom of the table
                var downloadFullResultForm = "<form style='float:right;' action='getMutPat.do' method='post'>" +
                    "<input type='hidden' name='cancer_study_id' value='" + window.QuerySession.getCancerStudyIds()[0] + "'>" +
                    "<input type='hidden' name='gene' value='" + geneId + "'>" +
                    "<input type='hidden' name='profile_id' value='" + $("#mutpat-profile-selector :selected").val() + "'>" + 
                    "<input type='hidden' name='groups' value='" + $("#mutpat-groups-selector :selected").val() + "'>" + 
                    "<input type='hidden' name='zscore_threshold' value='" + window.QuerySession.getZScoreThreshold() + "'>" +
                    "<input type='hidden' name='case_set_id' value='" + window.QuerySession.getCaseSetId() + "'>" +
                    "<input type='hidden' name='case_ids_key' value='" + window.QuerySession.getCaseIdsKey() + "'>" +
                    "<input type='hidden' name='is_download' value='true'>" +
                    "<input type='hidden' name='get_patterns' value='false'>" +
                    "<input type='submit' value='Download Full Results'></form>";
                $("#" + Names.tableDivId).append(downloadFullResultForm);            
            }

            function attachMagnitudeFilter() { 
                //Add drop down filter for single/all pattern display
                $("#" + Names.tableDivId + position).find('.mutpat-table-filter-magnitude').append(
                    "<select id='mutpat-table-select-" + cbio.util.safeProperty(geneId) + "' style='width: 230px; margin-left: 5px;'>" +
                    "<option value='all'>Show All</option>" +
                    "<option value='singleMagnitude'>Show Only Single Genes</option>" +
                    "<option value='multipleMagnitude'>Show Only Gene Patterns</option>" +
                    "</select>");
                $("select#mutpat-table-select-" + cbio.util.safeProperty(geneId)).change(function () {
                    if ($(this).val() === "singleMagnitude") {
                        mutPatTableInstance.fnFilter("1", 1, false);
                    } else if ($(this).val() === "multipleMagnitude") {
                        mutPatTableInstance.fnFilter('^(?!1$).*$', 1, true);
                    } else if ($(this).val() === "all") {
                        mutPatTableInstance.fnFilter("", 1);
                    }
                });
            }

            function attachRowListener() {
                $("#" + Names.tableId + position + " tbody tr").live('click', function (event) {
                    //Highlight selected row
                    $(mutPatTableInstance.fnSettings().aoData).each(function (){
                        $(this.nTr).removeClass('row_selected');
                    });
                    $(event.target.parentNode).addClass('row_selected');
                    //Get the gene name of the selected row
                    var aData = mutPatTableInstance.fnGetData(this);
                    // if (null !== aData) {
                    //     $("#" + Names.plotId).empty();
                    //     $("#" + Names.plotId).append("<img style='padding:220px;' src='images/ajax-loader.gif' alt='loading' />");
                    //     var mutpatPlots = new MutpatPlots();
                    //     mutpatPlots.init(Names.plotId, geneId, aData[0], aData[2], aData[3], $("#mutpat-profile-selector :selected").val());
                    // }
                });
            }

            function initTable() {
                //Init with selecting the first row
                // $('#' + Names.tableId + position + ' tbody tr:eq(0)').click();
                // $('#' + Names.tableId + position + ' tbody tr:eq(0)').addClass("row_selected");
            }

            //Overwrite some datatable function for custom filtering
            function overWriteFilters() {
                jQuery.fn.dataTableExt.oSort['mutpat-absolute-value-desc'] = function(a,b) {
                    if (Math.abs(a) > Math.abs(b)) return -1;
                    else if (Math.abs(a) < Math.abs(b)) return 1;
                    else return 0;
                };
                jQuery.fn.dataTableExt.oSort['mutpat-absolute-value-asc'] = function(a,b) {
                    if (Math.abs(a) > Math.abs(b)) return 1;
                    else if (Math.abs(a) < Math.abs(b)) return -1;
                    else return 0;
                };
            }  

            function convertData(_result, _groups) {
                // Get ID for table
                var id = 0;
                if (position === "R") {
                    if (_groups == 0) {
                        id = 2;
                    } else {
                        id = _groups-1;
                    }                   
                } 
                
                //Convert the format of the callback result to fit datatable
                mutpatTableArr = [];
                $.each(_result[id], function(i, obj) {
                    var tmp_arr = [];
                    tmp_arr.push(obj.pattern);
                    tmp_arr.push(obj.magnitude);
                    tmp_arr.push(obj.support.toFixed(3));
                    mutpatTableArr.push(tmp_arr);
                });   
            }

            function getMutPatDataCallBack(result, groups) {
                //Hide the loading img
                $("#" + Names.loadingImgId).empty();
                if (result.length === 0) {
                    $("#" + Names.tableDivId + position).append("There are no alteration patterns with an support of ?? or higher.");
                    attachDownloadFullResultButton();                    
                } else if (position === "R" && groups == 1) {
                    $("#" + Names.tableDivId + position).append("There is only one group to display.");
                } else {
                    //Render datatable
                    convertData(result, groups);
                    overWriteFilters(); 
                    configTable();
                    if ( position === "L" ) {
                        attachDownloadFullResultButton();
                    }
                    attachMagnitudeFilter();
                    attachRowListener();
                    initTable();                    
                }
            }

            return {
                init: function(_geneId) {
                    //Getting co-exp data (for currently selected gene/profile) from servlet
                    // $("#" + Names.plotId).empty();
                    var paramsGetMutPatData = {
                         cancer_study_id: window.QuerySession.getCancerStudyIds()[0],
                         gene: _geneId,
                         profile_id: $("#mutpat-profile-selector :selected").val(),
                         groups: $("#mutpat-groups-selector :selected").val(),
                         zscore_threshold: window.QuerySession.getZScoreThreshold(),
                         case_set_id: window.QuerySession.getCaseSetId(),
                         case_ids_key: window.QuerySession.getCaseIdsKey(),
                         is_download: "false",
                         get_patterns: "true"
                    };
                    $.post(
                        "getMutPat.do", 
                        paramsGetMutPatData, 
                        function(result) {
                            getMutPatDataCallBack(result, paramsGetMutPatData.groups);
                        },
                        "json"
                    );
                }
            };          
            
        }; //Closing MutPatTable
        
        var MutPatPlot = function() {
    
            // dimensions
            var margin = {top: 20, right: 20, bottom: 20, left: 40},
                style = {size : 2, shape: "circle"},
                svg_dx = parseInt(dim.mutpat_plots_width),
                svg_dy = parseInt(dim.mutpat_plots_height),
                chart_dx = svg_dx - margin.right - margin.left,
                chart_dy = svg_dy - margin.top - margin.bottom;


            var d = [];
            var circles = {};
            var xAxis = {};
            var yAxis = {};
            var x_axis = {};
            var y_axis = {};
            var svg = {};
            var xScale = {};
            var yScale = {};


            var tooltip = d3.select("#" + Names.plotId)
                .append("div")
                .style("position", "absolute")
                .style("z-index", "10")
                .style("background-color", "lightyellow")
                .style("padding", "4px")
                .style("border-radius", "4px")
                .style("text-align", "center")
                // .attr("classes", "qtip-light qtip-rounded qtip-shadow qtip-lightyellow")
                .style("visibility", "hidden");
            

            // function zoom() {
            //
            //     // re-scale x axis during zoom;
            //     x_axis.transition()
            //         .duration(50)
            //         .call(xAxis.scale(d3.event.transform.rescale(xScale)));
            //
            //     // re-draw circles using new x-axis scale;
            //     var new_xScale = d3.event.transform.rescale(xScale);
            //     circles.attr("cx", function(d) { return new_xScale(d.x); });
            // }

            function addQtips() {

                // d3.select("#" + Names.plotId).selectAll('circle').each(
                //     function(d) {
                //         $(this).qtip(
                //             {
                //                 content: {text: "<font size=2>" + d.qtip},
                //                 style: { classes: 'qtip-light qtip-rounded qtip-shadow qtip-lightyellow' },
                //                 show: {event: "mouseover"},
                //                 hide: {fixed:true, delay: 100, event: "mouseout"},
                //                 position: {my:'left bottom',at:'top right', viewport: $(window)}
                //             }
                //         );
                //     }
                // );

                //Hover Animation
                var mouseOn = function() {
                    var dot = d3.select(this);
                    var data = dot.datum();
                    tooltip.style("visibility", "visible")
                        .style("top", (d3.event.pageY + 5) + "px")
                        .style("left", (d3.event.pageX + 5) + "px")
                        .html("<b>" + data.qtip + "</b><br>" + data.x + "<br>" + data.y);
                    dot.transition()
                        .ease("linear")
                        .duration(200)
                        .delay(50)
                        .attr("r", (style.size * 5));
                };
                var mouseOff = function(d) {
                    var dot = d3.select(this);
                    tooltip.style("visibility", "hidden");
                    dot.transition()
                        .ease("linear")
                        .duration(200)
                        .delay(200)
                        .attr("r", style.size);
                };
                d3.select("#" + Names.plotId).selectAll("circle").attr('pointer-events', 'all').on("mouseover", mouseOn);
                d3.select("#" + Names.plotId).selectAll("circle").attr('pointer-events', 'all').on("mouseout", mouseOff);
            }
            
            function convertData(_result, _groups) {
                d = [];
                $.each(_result, function(i, obj) {
                    var mutationArr = obj.Mutations.split(" ");
                    var expression = parseFloat(obj.Expression);
                    if(!isNaN(expression)) {
                        var datapoint = {
                            x: expression,
                            y: mutationArr.length,
                            mutations: mutationArr,
                            qtip: obj.SampleId
                        };
                        d.push(datapoint);
                    }
                });
            }

            function getDataCallBack(result, groups) {
                
                convertData(result, groups);

                // Scales
                var xMin = d3.min(d, function(d) {return d.x;}),
                    xMax = d3.max(d, function(d) {return d.x;}),
                    xRange = xMax-xMin,
                    paddingRange = 0.05,
                    paddingX = xRange*paddingRange;
                
                xScale = d3.scale.linear()
                    .domain([
                        xMin - paddingX,
                        xMax + paddingX
                    ])
                    .range([margin.left, (svg_dx-margin.right)]);
                yScale = d3.scale.linear()
                    .domain([
                        0,
                        d3.max(d, function(d) {return d.y;})
                    ])
                    .range([(svg_dy-margin.top), margin.bottom]);

                // axes
                // xAxis = d3.svg.axis().scale(xScale).tickFormat(function(d) { return d.x;}); // d3.axis.axisBottom(xScale);
                xAxis = d3.svg.axis().scale(xScale).orient("bottom");
                yAxis = d3.svg.axis().scale(yScale).orient("left");
                
                // init
                svg = d3.select("#" + Names.plotId)
                    .append("svg")
                    .attr("width", svg_dx)
                    .attr("height", svg_dy)
                    // .call(d3.behavior.zoom().on("zoom", zoom));


                // add axes
                x_axis = svg.append("g")
                    .attr("id", "x_axis")
                    .attr("transform", "translate(0," + (svg_dy - margin.bottom) + ")")
                    // .attr("transform", "translate(75,0)")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", chart_dx / 2.0)
                    .attr("y", 28)
                    .style("text-anchor", "end")
                    .text("Expression");
                x_axis.select("line").style("fill", "none").style("stroke", "#000").style("shape-rendering", "crispEdges");
                y_axis = svg.append("g")
                    .attr("id", "y_axis")
                    .attr("transform", "translate(" + margin.left + ", 0)")
                    // .attr("transform", "translate(75,0)")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", -40)
                    .attr("x", -(chart_dy / 2.0))
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Mutation Count");
                y_axis.select("line").style("fill", "none").style("stroke", "#000").style("shape-rendering", "crispEdges");

                // plot data
                circles = svg.append("g")
                    .attr("id", "circles")
                    // .attr("transform", "translate(200, 0)")
                    .selectAll("circle")
                    .data(d)
                    .enter()
                    .append("circle")
                    .attr("r", style.size)
                    .attr("cx", function(d) { return xScale(d.x); })
                    .attr("cy", function(d) { return yScale(d.y); });
                    // .attr()
                    // .style("fill", function(d) {
                    //     var norm_color = colorScale(d[1]);
                    //     return d3.interpolateInferno(norm_color)
                    // });
                
                addQtips();
                
            }

            return {
                init: function(_geneId) {
                    var paramsGetMutPatData = {
                        cancer_study_id: window.QuerySession.getCancerStudyIds()[0],
                        gene: _geneId,
                        profile_id: $("#mutpat-profile-selector :selected").val(),
                        groups: $("#mutpat-groups-selector :selected").val(),
                        zscore_threshold: window.QuerySession.getZScoreThreshold(),
                        case_set_id: window.QuerySession.getCaseSetId(),
                        case_ids_key: window.QuerySession.getCaseIdsKey(),
                        is_download: "false",
                        get_patterns: "false"
                    };
                    $.post(
                        "getMutPat.do",
                        paramsGetMutPatData,
                        function(result) {
                            getDataCallBack(result, paramsGetMutPatData.groups);
                        },
                        "json"
                    );
                }
            };

        }; //Closing MutPatPlot

        function assembleNames() {
            //figure out div id
            var safeGeneId = cbio.util.safeProperty(geneId);
            Names.divId = Prefix.divPrefix + safeGeneId;
            Names.loadingImgId = Prefix.loadingImgPrefix + safeGeneId;
            Names.tableId = Prefix.tablePrefix + safeGeneId + jQuery.now();
            Names.tableDivId = Prefix.tableDivPrefix + safeGeneId;
            Names.plotId = Prefix.plotPrefix + safeGeneId;
        }

        function drawLayout() {
            //Configure the layout(div) of table and plots
            var tableDivIdL = Names.tableDivId + "L";
            var tableDivIdR = Names.tableDivId + "R";
            
            $("#" + Names.divId).append(
                "<table>" +
                "<tr>" +
                "<td width='" + dim.mutpat_tables_width + "' valign='top'>" + 
                "<div id='" + Names.tableDivId + "'> " +
                "<div id='" + tableDivIdL + "' style='display: inline-block; float: left; width: " + dim.mutpat_table_width + ";' ></div>" +
                "<div id='" + tableDivIdR + "' style='display: inline-block; float: right; width: " + dim.mutpat_table_width + ";' ></div>" +
                "</div></td>" +
                "</tr>" +
                "<tr>" +
                "<td width='" + dim.mutpat_plots_width + "' valign='top'>" +
                "<div id='" + Names.plotId + "' style='margin-top: 20px'> " +
                "</div></td>" +
                "</tr>" +
                "</table>");
            $("#" + Names.tableDivId).addClass("mutpat-table");
            // $("#" + Names.tableDivId).addClass("mutpat-plots");
            var tableIdL = Names.tableId + "L";
            var tableIdR = Names.tableId + "R";
            $("#" + tableDivIdL).append(
                "<table id='" + tableIdL + "' class='display mutpat_datatable_" + geneId + "' cellpadding='0' cellspacing='0' border='0' style='float:left'></table>");
            $("#" + tableDivIdR).append(
                "<table id='" + tableIdR + "' class='display mutpat_datatable_" + geneId + "' cellpadding='0' cellspacing='0' border='0' style='float:right'></table>");
        }

        return {
            init: function(_geneId) {
                //Set the attributes of the sub-view instance
                geneId = _geneId;
                //TODO: Just a quick fix for the sub-tab collapse bug
                $(window).trigger("resize");
                //Get the div id of the right sub-tab
                var element = $(".mutpat_datatable_" + cbio.util.safeProperty(_geneId));
                if (element.length === 0) { //Avoid duplication (see if the subtab instance already exists)
                    assembleNames();
                    drawLayout();
                    var mutPatTableLeft = new MutPatTable("L");
                    mutPatTableLeft.init(geneId);
                    var mutPatTableRight = new MutPatTable("R");
                    mutPatTableRight.init(geneId);
                    var mutPatPlot = new MutPatPlot();
                    mutPatPlot.init(geneId);
                }
            }
        };

    };   //Closing mutPatSubTabView

    function getGeneticProfileCallback(result) {
        var _genes = window.QuerySession.getQueryGenes();
        //Init Profile selector
        var _profile_list = {};
        _.each(_genes, function(_gene) {
            _profile_list = _.extend(_profile_list, result[_gene]);
        });
        ProfileSelector.init(_profile_list);
        GroupsSelector.init();
        // if (profileList.length === 1) {
        //     $("#mutpat-profile-selector-dropdown").hide();
        // }
        var mutPatSubTabView = new MutPatSubTabView();
        mutPatSubTabView.init(_genes[0]);
    }

    return {
        init: function() {
            //Init Tabs
            Tabs.appendTabsContent();
            Tabs.appendLoadingImgs();
            Tabs.generateTabs();
            Tabs.bindListenerToTabs();
            //Get all the genetic profiles with data available 
            var paramsGetProfiles = {
                cancer_study_id: window.QuerySession.getCancerStudyIds()[0],
                case_set_id: window.QuerySession.getCaseSetId(),
                case_ids_key: window.QuerySession.getCaseIdsKey(),
                gene_list: window.QuerySession.getQueryGenes().join(" ")
            };
            $.post("getGeneticProfile.json", paramsGetProfiles, getGeneticProfileCallback, "json");
        },
        has_mutation_data: function() {
            return has_mutation_data;
        }
    };

}());    //Closing MutPatView
