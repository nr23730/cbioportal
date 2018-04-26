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
            mutpat_table_width: "380px",
            mutpat_plots_width: "750px"
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

        var MutPatTable = function() {

            function configTable() {
                //Draw out the markdown of the datatable
                $("#" + Names.tableId).append(
                    "<thead style='font-size:70%;' >" +
                    "<tr>" + 
                    "<th>Pattern</th>" +
                    "<th>Magnitude</th>" +
                    "<th>Support</th>" +
                    "</tr>" +
                    "</thead><tbody></tbody>"
                );

                //Configure the datatable with  jquery
                mutPatTableInstance = $("#" + Names.tableId).dataTable({
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
                    "<input type='hidden' name='is_full_result' value='true'>" +
                    "<input type='submit' value='Download Full Results'></form>";
                $("#" + Names.tableDivId).append(downloadFullResultForm);            
            }

            function attachMagnitudeFilter() { 
                //Add drop down filter for single/all pattern display
                $("#" + Names.tableDivId).find('.mutpat-table-filter-magnitude').append(
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
                $("#" + Names.tableId + " tbody tr").live('click', function (event) {
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
                $('#' + Names.tableId + ' tbody tr:eq(0)').click();
                $('#' + Names.tableId + ' tbody tr:eq(0)').addClass("row_selected");
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

            function convertData(_result) {
                //Convert the format of the callback result to fit datatable
                mutpatTableArr = [];
                $.each(_result, function(i, obj) {
                    var tmp_arr = [];
                    tmp_arr.push(obj.pattern);
                    tmp_arr.push(obj.magnitude);
                    tmp_arr.push(obj.support);
                    mutpatTableArr.push(tmp_arr);
                });   
                
                
                // Dummy Data for Mockup
                // mutpatTableArr.push(["TP53, TTN", 2, 0.52]);
                // mutpatTableArr.push(["CSMD3, TTN", 2, 0.30]);
                // mutpatTableArr.push(["NCOA3, TTN", 2, 0.24]);
                // mutpatTableArr.push(["TTN", 1, 0.74]);
                // mutpatTableArr.push(["TP53", 1, 0.76]);
                // mutpatTableArr.push(["PDE4DIP, TP53, TTN", 3, 0.22]);
            }

            function getMutPatDataCallBack(result, geneId) {
                //Hide the loading img
                $("#" + Names.loadingImgId).empty();
                if (result.length === 0) {
                    $("#" + Names.tableDivId).append("There are no alteration patterns with an support of ?? or higher.");
                    attachDownloadFullResultButton();                    
                } else {
                    //Render datatable
                    convertData(result);
                    overWriteFilters(); 
                    configTable();
                    attachDownloadFullResultButton();
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
                         is_full_result: "false"
                    };
                    $.post(
                        "getMutPat.do", 
                        paramsGetMutPatData, 
                        function(result) {
                            getMutPatDataCallBack(result, _geneId);
                        },
                        "json"
                    );
                }
            };          
            
        }; //Closing MutPatTable

        function assembleNames() {
            //figure out div id
            var safeGeneId = cbio.util.safeProperty(geneId);
            Names.divId = Prefix.divPrefix + safeGeneId;
            Names.loadingImgId = Prefix.loadingImgPrefix + safeGeneId;
            Names.tableId = Prefix.tablePrefix + safeGeneId + jQuery.now();
            Names.tableDivId = Prefix.tableDivPrefix + safeGeneId;
            // Names.plotId = Prefix.plotPrefix + safeGeneId;
        }

        function drawLayout() {
            //Configure the layout(div) of table and plots
            $("#" + Names.divId).append(
                "<table>" +
                "<tr>" +
                "<td width='" + dim.mutpat_table_width + "' valign='top'>" + 
                "<div id='" + Names.tableDivId + "'></div></td>" +
                // "<td width='" + dim.mutpat_plots_width + "' valign='top'>" + 
                // "<div id='" + Names.plotId + "'></div></td>" +
                "</tr>" +
                "</table>");
            $("#" + Names.tableDivId).addClass("mutpat-table");
            // $("#" + Names.tableDivId).addClass("mutpat-plots");
            $("#" + Names.tableDivId).append(
                "<table id='" + Names.tableId + "' class='display mutpat_datatable_" + geneId + "' cellpadding='0' cellspacing='0' border='0'></table>");
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
                    var mutPatTable = new MutPatTable();
                    mutPatTable.init(geneId);
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
