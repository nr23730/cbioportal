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

package org.mskcc.cbio.portal.util;

import org.apache.log4j.Logger;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.mskcc.cbio.portal.dao.*;
import org.mskcc.cbio.portal.model.*;
import org.mskcc.cbio.portal.model.converter.MutationModelConverter;
import org.mskcc.cbio.portal.repository.MutationRepositoryLegacy;
import org.mskcc.cbio.portal.web_api.GetMutationData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.util.*;

@Component
public class MutPatUtil {
    private static final Logger logger = Logger.getLogger(MutPatUtil.class);

    
    @SuppressWarnings("Duplicates")
    public static ArrayList<String> getSampleIds(String sampleSetId, String sampleIdsKeys) {
		try {
			DaoSampleList daoSampleList = new DaoSampleList();
            SampleList sampleList;
            ArrayList<String> sampleIdList = new ArrayList<String>();
            if (sampleSetId.equals("-1")) {
                String strSampleIds = SampleSetUtil.getSampleIds(sampleIdsKeys);
                String[] sampleArray = strSampleIds.split("\\s+");
                for (String item : sampleArray) {
                    sampleIdList.add(item);
                }
            } else {
                sampleList = daoSampleList.getSampleListByStableId(sampleSetId);
                sampleIdList = sampleList.getSampleList();
            }
			return sampleIdList;
        } catch (DaoException e) {
            System.out.println("Caught Dao Exception: " + e.getMessage());
			return null;
        }
    }

	public static GeneticProfile getPreferedGeneticProfile(String cancerStudyIdentifier) {
		try {
			CancerStudy cs = DaoCancerStudy.getCancerStudyByStableId(cancerStudyIdentifier);
			ArrayList<GeneticProfile> gps = DaoGeneticProfile.getAllGeneticProfiles(cs.getInternalId());
			GeneticProfile final_gp = null;
			for (GeneticProfile gp : gps) {
				// TODO: support miRNA later
				if (gp.getGeneticAlterationType() == GeneticAlterationType.MRNA_EXPRESSION) {
					//rna seq profile (z-scores applied) holds the highest priority)
					if (gp.getStableId().toLowerCase().contains("rna_seq") &&
					   gp.getStableId().toLowerCase().contains("zscores")) {
						final_gp = gp;
						break;
					} else if (gp.getStableId().toLowerCase().contains("zscores")) {
						final_gp = gp;
					}
				}
			}
			return final_gp;
		}
		catch (DaoException e) {
			return null;
		}
    }

    @SuppressWarnings("Duplicates")
    public static Map<String, Double> getExpressionMap(int profileId, String sampleSetId, String sampleIdsKeys, long entrezGeneId) throws DaoException {

        GeneticProfile final_gp = DaoGeneticProfile.getGeneticProfileById(profileId);
        List<String> stableSampleIds = getSampleIds(sampleSetId, sampleIdsKeys);
        List<Integer> sampleIds = InternalIdUtil.getInternalSampleIds(final_gp.getCancerStudyId(), stableSampleIds);
        Map<String, Double> map = new HashMap<>();
        DaoGeneOptimized daoGeneOptimized = DaoGeneOptimized.getInstance();

        ArrayList<String> tmpProfileDataArr =
            GeneticAlterationUtil.getGeneticAlterationDataRow(
                daoGeneOptimized.getGene(entrezGeneId),
                sampleIds,
                final_gp
            );
        for (int i = 0; i < sampleIds.size(); i++) {
            if (!tmpProfileDataArr.get(i).equals("NA") &&
                tmpProfileDataArr.get(i) != null &&
                !tmpProfileDataArr.get(i).equals("NaN") &&
                !tmpProfileDataArr.get(i).equals("")) {
                Double d;
                try {
                    d = Double.valueOf(tmpProfileDataArr.get(i));
                } catch (Exception e) {
                    d = Double.NaN;
                }
                Sample sample = DaoSample.getSampleById(sampleIds.get(i));
                map.put(sample.getStableId(), d);
            }
        }
        return map;
    }

    @SuppressWarnings("Duplicates")
    private static TreeMap<Double, String> getExpression(int profileId, String sampleSetId, String sampleIdsKeys, long entrezGeneId) throws DaoException {

        GeneticProfile final_gp = DaoGeneticProfile.getGeneticProfileById(profileId);
        List<String> stableSampleIds = getSampleIds(sampleSetId, sampleIdsKeys);
        List<Integer> sampleIds = InternalIdUtil.getInternalSampleIds(final_gp.getCancerStudyId(), stableSampleIds);
        TreeMap<Double, String> map = new TreeMap<Double, String>();
        DaoGeneOptimized daoGeneOptimized = DaoGeneOptimized.getInstance();

        ArrayList<String> tmpProfileDataArr =
            GeneticAlterationUtil.getGeneticAlterationDataRow(
                daoGeneOptimized.getGene(entrezGeneId),
                sampleIds,
                final_gp
            );
        for (int i = 0; i < sampleIds.size(); i++) {
            if (!tmpProfileDataArr.get(i).equals("NA") &&
                tmpProfileDataArr.get(i) != null &&
                !tmpProfileDataArr.get(i).equals("NaN") &&
                !tmpProfileDataArr.get(i).equals("")) {
                Double d;
                try {
                    d = Double.valueOf(tmpProfileDataArr.get(i));
                } catch (Exception e) {
                    d = Double.NaN;
                }
                Sample sample = DaoSample.getSampleById(sampleIds.get(i));
                map.put(d, sample.getStableId());
            }
        }
        return map;
    }

    public static Map<Integer, Map<String,Set<String>>> getAlterationMaps(int profileId, String sampleSetId, String sampleIdsKeys, long entrezGeneId, int groups, double zScoreThreshold, boolean mutation) throws DaoException {
        
        TreeMap<Double, String> expressionMap = getExpression(profileId, sampleSetId, sampleIdsKeys, entrezGeneId);
        Map<Integer, Set<String>> groupsMap = new HashMap<>();
        Map<Integer, Map<String,Set<String>>> resultMap = new HashMap<>();
        
        if( groups <= 0) {
            // use z-score threshold
            Set<String> low = new HashSet<>();
            Set<String> normal = new HashSet<>();
            Set<String> high = new HashSet<>();
            for (Map.Entry<Double, String> entry: expressionMap.entrySet()) {
                if(entry.getKey() <= -zScoreThreshold) {
                    low.add(entry.getValue());
                } else if(entry.getKey() >= zScoreThreshold) {
                    high.add(entry.getValue());
                } else {
                    normal.add(entry.getValue());
                }
            }
            resultMap.put(0, getAlterationMap(profileId, low, 0, mutation));
            resultMap.put(1, getAlterationMap(profileId, normal, 1, mutation));
            resultMap.put(2, getAlterationMap(profileId, high, 2, mutation));
        } else {
            List<String> orderedSampleIds = new ArrayList<>(expressionMap.values());
            int itemsPerGroup = expressionMap.size();
            if (groups >= 1 && expressionMap.size() > groups) {
                itemsPerGroup = expressionMap.size() / groups;
            }
            for (int i = 0; i < groups; i++) {
                Set<String> sampleIdsInGroup = new HashSet<>();
                int start = i*itemsPerGroup;
                int end = (i+1) * itemsPerGroup;
                if (i == groups-1) {
                    end = expressionMap.size();
                }
                for(int j = start; j < end; j++) {
                    sampleIdsInGroup.add(orderedSampleIds.get(j));
                }
                groupsMap.put(i, sampleIdsInGroup);
            }
            for (int i = 0; i < groups; i++) {
                resultMap.put(i, getAlterationMap(profileId, groupsMap.get(i), i, mutation));
            }
        }
        return resultMap;
    }

    private static Map<String,Set<String>> getAlterationMap(int profileId, Set<String> setOfSampleIds, int group, boolean mutation) throws DaoException {
        Map<String,Set<String>> map = new HashMap<>();
        Connection con = null;
        PreparedStatement pstmt = null;
        ResultSet rs = null;
        try {
            GeneticProfile geneticProfile = DaoGeneticProfile.getGeneticProfileById(profileId);
            List<GeneticProfile> geneticProfiles = DaoGeneticProfile.getAllGeneticProfiles(geneticProfile.getCancerStudyId());
            GeneticProfile alterationProfile = null;
            for(GeneticProfile g : geneticProfiles) {
                if(logger != null) {
                    logger.warn(g.getGeneticAlterationType().toString() + " " + g.getDatatype());
                }
                if(mutation) {
                    if(g.getGeneticAlterationType() == GeneticAlterationType.MUTATION_EXTENDED) {
                        alterationProfile = g;
                    }
                } else {
                    if(g.getGeneticAlterationType() == GeneticAlterationType.COPY_NUMBER_ALTERATION && g.getDatatype().toLowerCase().contains("discrete")) {
                        alterationProfile = g;
                    }
                }
            }
            if (alterationProfile == null) {
                return map;
            }

            con = JdbcUtil.getDbConnection(MutPatUtil.class);
            
            Statement setMaxLen = con.createStatement();
            setMaxLen.execute("SET group_concat_max_len=1000000");
            
            if(mutation) {
                pstmt = con.prepareStatement(
                    "SELECT m.SAMPLE_ID, GROUP_CONCAT(DISTINCT g.HUGO_GENE_SYMBOL SEPARATOR ',') as ALTERATIONS " +
                        "FROM mutation as m " +
                        "INNER JOIN gene g ON (g.ENTREZ_GENE_ID = m.ENTREZ_GENE_ID) " +
                        "WHERE m.GENETIC_PROFILE_ID = ? " +
                        "GROUP BY m.SAMPLE_ID");
            } else {
                pstmt = con.prepareStatement(
                    "SELECT SAMPLE_ID, REPLACE(REPLACE(GROUP_CONCAT(CONCAT(g.HUGO_GENE_SYMBOL, ' ', ALTERATION) SEPARATOR ','), ' -2', ' DEL'), ' 2', ' AMP') as ALTERATIONS " +
                        "FROM sample_cna_event, cna_event " +
                        "INNER JOIN gene g ON (g.ENTREZ_GENE_ID = cna_event.ENTREZ_GENE_ID) " +
                        "WHERE GENETIC_PROFILE_ID=  ? " +
                        "AND sample_cna_event.CNA_EVENT_ID=cna_event.CNA_EVENT_ID " +
                        "GROUP BY SAMPLE_ID");
            }
            pstmt.setInt(1, alterationProfile.getGeneticProfileId());
            rs = pstmt.executeQuery();
            
            if (logger != null) {
                SQLWarning warning = pstmt.getWarnings();
                if (warning != null)
                {
                    logger.warn("---Warning---");
                    while (warning != null)
                    {
                        logger.warn("Message: " + warning.getMessage());
                        logger.warn("SQLState: " + warning.getSQLState());
                        logger.warn("Vendor error code: " + warning.getErrorCode());
                        warning = warning.getNextWarning();
                    }
                }
            }
            
            
            while (rs.next()) {
                String sampleId = DaoSample.getSampleById(rs.getInt("SAMPLE_ID")).getStableId();
                if(setOfSampleIds.contains(sampleId)) {
                    Set<String> alterations = new HashSet<String>(Arrays.asList(rs.getString("ALTERATIONS").split(",")));
                    map.put(sampleId, alterations);
                }
            }
            
            return map;
        } catch (Exception e) {
            e.printStackTrace();
            logger.trace(e.getMessage());
            int counter = 0;
            for (String entry : setOfSampleIds) {
                String sampleId = entry;
                map.put(sampleId, new HashSet<>());
                map.get(sampleId).add("A" + group);
                if (counter % 2 == 0) map.get(sampleId).add("B" + group);
                if (counter % 3 == 0) map.get(sampleId).add("C" + group);
                counter++;
            }
            return map;
        } finally {
            
            JdbcUtil.closeAll(MutPatUtil.class, con, pstmt, rs);
        }
    }

    public static Map<String,Set<String>> getMutationMap(int profileId, String sampleSetId, String sampleIdsKeys, boolean mutation) throws DaoException {
        Set<String> setOfSampleIds = new HashSet<String>(getSampleIds(sampleSetId,sampleIdsKeys));
        return getAlterationMap(profileId, setOfSampleIds, 0, mutation);
    }


}
