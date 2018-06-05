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

package org.mskcc.cbio.portal.servlet;

import org.apache.commons.lang.math.NumberUtils;
import org.apache.spark.SparkConf;
import org.apache.spark.SparkContext;
import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.node.ArrayNode;
import org.codehaus.jackson.node.ObjectNode;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.mskcc.cbio.portal.dao.DaoCancerStudy;
import org.mskcc.cbio.portal.dao.DaoException;
import org.mskcc.cbio.portal.dao.DaoGeneOptimized;
import org.mskcc.cbio.portal.dao.DaoGeneticProfile;
import org.mskcc.cbio.portal.model.CancerStudy;
import org.mskcc.cbio.portal.model.CanonicalGene;
import org.mskcc.cbio.portal.model.GeneticProfile;
import org.mskcc.cbio.portal.util.*;

import org.apache.spark.mllib.fpm.FPGrowth;
import org.apache.spark.mllib.fpm.FPGrowthModel;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;


import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.*;

/**
 * Get the top co-expressed genes for queried genes
 *
 * @param : cancer study id
 * @param : queried genes
 * @return : JSON objects of co-expression under the same cancer_study
 * (but always the mrna genetic profile)
 */
public class GetMutationPatternsJSON extends HttpServlet {

    
    // class which process access control to cancer studies
    private AccessControl accessControl;
    
    private SparkConf sparkConf;
    private JavaSparkContext sc;
    
    /**
     * Initializes the servlet.
     */
    public void init() throws ServletException {
        super.init();
        accessControl = SpringUtil.getAccessControl();

        sparkConf = new SparkConf().setAppName("MutationPatterns").setMaster("local[2]").set("spark.executor.memory","1g");
        sc = new JavaSparkContext(sparkConf);
    }

    /**
     * Handles HTTP GET Request.
     *
     * @param httpServletRequest  HttpServletRequest
     * @param httpServletResponse HttpServletResponse
     * @throws ServletException
     */
    protected void doGet(HttpServletRequest httpServletRequest,
                         HttpServletResponse httpServletResponse) throws ServletException, IOException {
        doPost(httpServletRequest, httpServletResponse);
    }

    
    /**
     * Handles the HTTP POST Request.
     *
     * @param httpServletRequest  HttpServletRequest
     * @param httpServletResponse HttpServletResponse
     * @throws ServletException
     */
    @SuppressWarnings("Duplicates")
    protected void doPost(HttpServletRequest httpServletRequest,
                          HttpServletResponse httpServletResponse) throws ServletException, IOException {

        String cancerStudyIdentifier = httpServletRequest.getParameter("cancer_study_id");
        CancerStudy cancerStudy = null;
        ArrayList<JsonNode> fullResultJson = new ArrayList<JsonNode>();
        ObjectMapper mapper = new ObjectMapper();
        httpServletResponse.setContentType("application/json");
        PrintWriter out = httpServletResponse.getWriter();
        try{
        	if(cancerStudyIdentifier != null) {
        		cancerStudy = DaoCancerStudy.getCancerStudyByStableId(cancerStudyIdentifier);
                if (cancerStudy == null || accessControl.isAccessibleCancerStudy(cancerStudy.getCancerStudyStableId()).size() == 0) {
                	 mapper.writeValue(out, fullResultJson);
                	 return;
                }
        	} else {
        		mapper.writeValue(out, fullResultJson);
           	 return;
        	}
        } catch (DaoException e) {
            System.out.println(e.getMessage());
            return;
        }
        
        String geneSymbol = httpServletRequest.getParameter("gene");
        if (httpServletRequest instanceof XssRequestWrapper) {
            geneSymbol = ((XssRequestWrapper) httpServletRequest).getRawParameter("gene");
        }
        String profileId = httpServletRequest.getParameter("profile_id");
        String caseSetId = httpServletRequest.getParameter("case_set_id");
        String caseIdsKey = httpServletRequest.getParameter("case_ids_key");
        boolean isDownload = Boolean.parseBoolean(httpServletRequest.getParameter("is_download"));
        boolean getPatterns = Boolean.parseBoolean(httpServletRequest.getParameter("get_patterns"));
        boolean mutation = getBoolFromAlterationProfile(httpServletRequest.getParameter("alteration_profile_id"));
        
        int groups = NumberUtils.toInt(httpServletRequest.getParameter("groups"), 1);
        double minSupport = NumberUtils.toDouble(httpServletRequest.getParameter("support"), 0.1);
        double zScoreThreshold = NumberUtils.toDouble(httpServletRequest.getParameter("zscore_threshold"), 2.0);
        
        DaoGeneOptimized daoGeneOptimized = DaoGeneOptimized.getInstance();

        CanonicalGene geneObj = daoGeneOptimized.getGene(geneSymbol);
        Long queryGeneId = geneObj.getEntrezGeneId();

        if (isDownload) {
            StringBuilder fullResutlStr = new StringBuilder();
            fullResutlStr.append("Group\tSampleID\tExpression\tAlterations\n");
            GeneticProfile final_gp = DaoGeneticProfile.getGeneticProfileByStableId(profileId);
            if (final_gp != null) {
                try {
                    Map<String, Double> expressionMap = MutPatUtil.getExpressionMap(final_gp.getGeneticProfileId(), caseSetId, caseIdsKey, queryGeneId);
                    Map<Integer, Map<String,Set<String>>> map = MutPatUtil.getAlterationMaps(final_gp.getGeneticProfileId(), caseSetId, caseIdsKey, queryGeneId, groups, zScoreThreshold, mutation);
                    for (int i = 0; i < map.size(); i++ ) {
                        TreeMap<String, Set<String>> treeMap = new TreeMap<>(map.get(i));
                        for (Map.Entry<String, Set<String>> entry: treeMap.entrySet()) {
                            fullResutlStr.append(
                                i + "\t" +
                                    entry.getKey() + "\t" +
                                    expressionMap.get(entry.getKey()) + "\t" +
                                    String.join(",", entry.getValue()) + "\n"
                            );
                        }
                    }

                    //construct file name
                    String fileName = "mutationPatterns_" + geneSymbol + "_" +
                        final_gp.getProfileName().replaceAll("\\s+", "_") + "_" +
                        cancerStudyIdentifier.replaceAll("\\s+", "_") + ".txt";

                    httpServletResponse.setContentType("text/html");
                    httpServletResponse.setContentType("application/force-download");
                    httpServletResponse.setHeader("content-disposition", "inline; filename='" + fileName + "'");
                    out = httpServletResponse.getWriter();
                    JSONValue.writeJSONString(fullResutlStr, out);
                } catch (DaoException e) {
                    System.out.println(e.getMessage());
                    JSONValue.writeJSONString(new JSONObject(), out);
                }
            } else {
                JSONValue.writeJSONString(new JSONObject(), out);
            }
        } else {
            GeneticProfile final_gp = DaoGeneticProfile.getGeneticProfileByStableId(profileId);
            if (final_gp != null) {
                try {
                    if (getPatterns) {
                        Map<Integer, Map<String,Set<String>>> map = MutPatUtil.getAlterationMaps(final_gp.getGeneticProfileId(), caseSetId, caseIdsKey, queryGeneId, groups, zScoreThreshold, mutation);
                        Map<Integer, Map<Set<String>, Double>> resultMaps = new HashMap<>();
                        if(groups == 0) {
                            groups = 3;
                        }
                        for (Map.Entry<Integer, Map<String,Set<String>>> mutationMap: map.entrySet()) {
                            resultMaps.put(mutationMap.getKey(), new HashMap<>());
                            if(mutationMap.getKey() != 0 || mutationMap.getKey() != (groups-1)) {
                                continue;
                                // Increase Performance
                                // right now only the first and last group get used as a result so we don't have to calculate all other groups
                            }
                            List<List<String>> transactions = new ArrayList<>();
                            for (Map.Entry<String, Set<String>> entry: mutationMap.getValue().entrySet()) {
                                transactions.add(new ArrayList<>(entry.getValue()));
                            }

                            FPGrowth fpg = new FPGrowth().setMinSupport(minSupport);
                            JavaRDD<List<String>> rdd = sc.parallelize(transactions);
                            FPGrowthModel<String> fpgModel = fpg.run(rdd);

                            for (FPGrowth.FreqItemset<String> itemset: fpgModel.freqItemsets().toJavaRDD().collect()) {
                                resultMaps.get(mutationMap.getKey()).put(new HashSet<>(itemset.javaItems()), (double)itemset.freq()/(double)transactions.size());
                            }
                        }
                        for (Map.Entry<Integer, Map<Set<String>, Double>> resultMap: resultMaps.entrySet()) {
                            ArrayNode arrayNode = mapper.createArrayNode();
                            int group = resultMap.getKey();
                            int otherGroup = 0;

                            if(group == 0) otherGroup = groups - 1;
                            for (Map.Entry<Set<String>, Double> pattern: resultMap.getValue().entrySet()) {
                                ObjectNode _scores = mapper.createObjectNode();
                                if(groups != 1) {
                                    double support = pattern.getValue();
                                    _scores.put("pattern", String.join(", ", pattern.getKey()));
                                    _scores.put("magnitude", pattern.getKey().size());
                                    _scores.put("support", support);
                                    if((group == 0 || group == groups - 1) && resultMaps.get(otherGroup).containsKey(pattern.getKey())) {
                                        _scores.put("supportOther", (pattern.getValue() - resultMaps.get(otherGroup).get(pattern.getKey())));
                                    } else {
                                        _scores.put("supportOther", "N/A");
                                    }
                                } else {
                                    _scores.put("pattern", String.join(", ", pattern.getKey()));
                                    _scores.put("magnitude", pattern.getKey().size());
                                    _scores.put("support", pattern.getValue());
                                    _scores.put("supportOther", "N/A");
                                }
                                arrayNode.add(_scores);                            
                            }
                            fullResultJson.add(arrayNode);
                        }
                        mapper.writeValue(out, fullResultJson);
                    } else {
                        Map<String, Double> expressionMap = MutPatUtil.getExpressionMap(final_gp.getGeneticProfileId(), caseSetId, caseIdsKey, queryGeneId);
                        Map<Integer, Map<String,Set<String>>> map = MutPatUtil.getAlterationMaps(final_gp.getGeneticProfileId(), caseSetId, caseIdsKey, queryGeneId, groups, zScoreThreshold, mutation);
                        for (int i = 0; i < map.size(); i++ ) {
                            TreeMap<String, Set<String>> treeMap = new TreeMap<>(map.get(i));
                            for (Map.Entry<String, Set<String>> entry: treeMap.entrySet()) {
                                ObjectNode _scores = mapper.createObjectNode();
                                _scores.put("Group", i);
                                _scores.put("SampleId", entry.getKey());
                                _scores.put("Expression", expressionMap.get(entry.getKey()));
                                _scores.put("Alterations", String.join(",", entry.getValue()));
                                if(_scores.get("Expression") != null) fullResultJson.add(_scores);
                            }
                        }
                        mapper.writeValue(out, fullResultJson);
                    }
                } catch (DaoException e) {
                    System.out.println(e.getMessage());
                    mapper.writeValue(out, new JSONObject());
                }
            } else {
                mapper.writeValue(out, new JSONObject());
            }
        }

    }
    
    private boolean getBoolFromAlterationProfile(String alterationProfile) {
        if(alterationProfile.toLowerCase().contains("mutation")) return true;
        else return false;
    }
}



