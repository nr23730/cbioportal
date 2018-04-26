<%--
 - Copyright (c) 2015 Memorial Sloan-Kettering Cancer Center.
 -
 - This library is distributed in the hope that it will be useful, but WITHOUT
 - ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS
 - FOR A PARTICULAR PURPOSE. The software and documentation provided hereunder
 - is on an "as is" basis, and Memorial Sloan-Kettering Cancer Center has no
 - obligations to provide maintenance, support, updates, enhancements or
 - modifications. In no event shall Memorial Sloan-Kettering Cancer Center be
 - liable to any party for direct, indirect, special, incidental or
 - consequential damages, including lost profits, arising out of the use of this
 - software and its documentation, even if Memorial Sloan-Kettering Cancer
 - Center has been advised of the possibility of such damage.
 --%>

<%--
 - This file is part of cBioPortal.
 -
 - cBioPortal is free software: you can redistribute it and/or modify
 - it under the terms of the GNU Affero General Public License as
 - published by the Free Software Foundation, either version 3 of the
 - License.
 -
 - This program is distributed in the hope that it will be useful,
 - but WITHOUT ANY WARRANTY; without even the implied warranty of
 - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 - GNU Affero General Public License for more details.
 -
 - You should have received a copy of the GNU Affero General Public License
 - along with this program.  If not, see <http://www.gnu.org/licenses/>.
--%>

<script type="text/javascript" src="js/src/mutation_patterns/mutationPatterns.js?<%=GlobalProperties.getAppVersion()%>"></script>
<script type="text/javascript" src="js/src/mutation_patterns/data/MutpatPlotsProxy.js?<%=GlobalProperties.getAppVersion()%>"></script>
<script type="text/javascript" src="js/src/mutation_patterns/view/MutpatPlotsView.js?<%=GlobalProperties.getAppVersion()%>"></script>
<script type="text/javascript" src="js/src/mutation_patterns/view/components/MutpatPlots.js?<%=GlobalProperties.getAppVersion()%>"></script>
<script type="text/javascript" src="js/src/mutation_patterns/view/components/MutpatPlotsBoilerplate.js?<%=GlobalProperties.getAppVersion()%>"></script>

<style>
    #mutpat .mutpat-table-filter-custom {
        width: 400px;
        float: left;
    }
    #mutpat .datatables_filter {
        width: 300px;
        float: left;
        margin-left: 0px;
        text-align: left;
        font-size: 11px;
        padding-left: 6px;
    }
    #mutpat .dataTables_paginate {
        float: right;
        padding: 3px;
    }
    #mutpat .paging_full_numbers .ui-button {
        border: 1px solid #aaa;
        -webkit-border-radius: 5px;
        -moz-border-radius: 5px;
        padding: 2px 5px;
        margin: 0 3px;
        cursor: hand;
        text-align: left;
    }
    #mutpat .dataTables_info {
        float: left;
        width: auto;
    }
    #mutpat .mutpat-tabs-ref {
        font-size: 11px !important;
    }
    #mutpat .mutpat-table {
        width: 100%;
    }
    #mutpat .mutpat-plots {
        float: left;
    }
    #mutpat p {
        font-size: 12px;
        display: block;
        text-align: left;
        font-family: Verdana,Arial,sans-serif;
        margin-bottom: 12px;
    }
    .ui-state-disabled {
        display: none;
    }  

</style>

<div class="section" id="mutpat">
    <p>
        <div id='mutpat-profile-selector-dropdown' style="margin-top:10px;"></div>
        <div id='mutpat-groups-selector-dropdown' style="margin-left:10px;"></div>
        These tables lists the genes patterns in the groups of lowest and highest expressed query genes. 
        <img src='images/help.png' id='mutpat-help' alt='help'>
    </p>
    <div id="mutpat-tabs" class="mutpat-tabs">
        <ul id='mutpat-tabs-list'></ul>
        <div id='mutpat-tabs-content'></div>
    </div>
</div>

<script>
    $(document).ready( function() {
        var mutpat_tab_init = false;
        if ($("#mutpat").is(":visible")) {     
            fireQuerySession();
            MutPatView.init();
            mutpat_tab_init = true;
        } else {
            $(window).trigger("resize");
        }
        $("#tabs").bind("tabsactivate", function(event, ui) {
            if (ui.newTab.text().trim().toLowerCase() === "mutation patterns") {

                if (mutpat_tab_init === false) {
                    fireQuerySession();
                    MutPatView.init();
                    mutpat_tab_init = true;
                    $(window).trigger("resize");
                } else {
                    $(window).trigger("resize");
                }
            }
        });
    });
    $("#mutpat-help").qtip({
        content: { text:'The samples are ordered by their expression of the query gene and separated into groups. The tables show the mutation patterns in the lowest and highest expressed groups.'},
        style: { classes: 'ui-tooltip-light ui-tooltip-rounded ui-tooltip-shadow ui-tooltip-lightyellow' },
        show: {event: "mouseover"},
        hide: {fixed:true, delay: 100, event: "mouseout"},
        position: {my:'left bottom',at:'top right',viewport: $(window)}
    })
</script>
