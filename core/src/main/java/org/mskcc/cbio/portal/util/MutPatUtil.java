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
import org.mskcc.cbio.portal.dao.*;
import org.mskcc.cbio.portal.model.*;
import org.mskcc.cbio.portal.model.converter.MutationModelConverter;
import org.mskcc.cbio.portal.repository.MutationRepositoryLegacy;
import org.mskcc.cbio.portal.web_api.GetMutationData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class MutPatUtil {
    private static final Logger logger = Logger.getLogger(MutPatUtil.class);

    @Autowired
    private static MutationRepositoryLegacy mutationRepositoryLegacy;

    @Autowired
    private static MutationModelConverter mutationModelConverter;
    
    
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


    public static Map<Integer,Double> getExpression(int profileId, String sampleSetId, String sampleIdsKeys, long entrezGeneId) throws DaoException {

        GeneticProfile gp = DaoGeneticProfile.getGeneticProfileById(profileId);
        List<String> stableSampleIds = getSampleIds(sampleSetId, sampleIdsKeys);
        List<Integer> sampleIds = new ArrayList<Integer>();
        for(String sampleId : stableSampleIds) {
            Sample sample = DaoSample.getSampleByCancerStudyAndSampleId(gp.getCancerStudyId(), sampleId);
            sampleIds.add(sample.getInternalId());
        }
        sampleIds.retainAll(DaoSampleProfile.getAllSampleIdsInProfile(profileId));

        DaoGeneticAlteration daoGeneticAlteration = DaoGeneticAlteration.getInstance();
        Map<Integer, String> mapStr = daoGeneticAlteration.getGeneticAlterationMap(profileId, entrezGeneId);
        Map<Integer, Double> map = new HashMap<Integer, Double>(mapStr.size());
        for (Map.Entry<Integer, String> entry : mapStr.entrySet()) {
            Integer caseId = entry.getKey();
            String value = entry.getValue();
            Double d;
            try {
                d = Double.valueOf(value);
            } catch (Exception e) {
                d = Double.NaN;
            }
            map.put(caseId, d);
        }

        return map;
    }

    public static Map<Integer,Set<String>> getMutationMap(int profileId, String sampleSetId, String sampleIdsKeys, long entrezGeneId) throws DaoException {

        List<String> geneList = Arrays.asList("TTN", "PDE4DIP", "TP53", "CSMD3", "DST", "OBSCN", "DNAH8", "LRP1B");
        
        Map<Integer, Double> expressionMap = getExpression(profileId, sampleSetId, sampleIdsKeys, entrezGeneId);
        Map<Integer,Set<String>> map = new HashMap<>();
        
        Set<String> setOfSampleIds = new HashSet<String>(getSampleIds(sampleSetId,sampleIdsKeys));
        try {
            if(mutationModelConverter == null) {
                throw new Exception("mutationModelConverter is null");
            }
            if(mutationRepositoryLegacy == null) {
                throw new Exception("mutationRepositoryLegacy is null");
            }
            GetMutationData remoteCallMutation = new GetMutationData(mutationRepositoryLegacy, mutationModelConverter);
            GeneticProfile geneticProfile = DaoGeneticProfile.getGeneticProfileById(profileId);
            List<ExtendedMutation> mutationList = remoteCallMutation.getMutationData(geneticProfile,
                geneList,
                setOfSampleIds,
                null);

            for (ExtendedMutation mutation : mutationList)
            {
                Integer sampleId = mutation.getSampleId();
    
                if (expressionMap != null &&
                    expressionMap.keySet().contains(sampleId))
                {
                    if (!map.containsKey(sampleId)) {
                        map.put(sampleId, new HashSet<String>());
                    }
                    map.get(sampleId).add(mutation.getGeneSymbol());
                }
            }
            return map;
        } catch (Exception e) {
            e.printStackTrace();
            logger.trace(e.getMessage());
            int counter = 0;
            for (Map.Entry<Integer, Double> entry : expressionMap.entrySet()) {
                int sampleId = entry.getKey();
                map.put(sampleId, new HashSet<>());
                map.get(sampleId).add("A");
                if (counter % 2 == 0) map.get(sampleId).add("B");
                if (counter % 3 == 0) map.get(sampleId).add("C");
                counter++;
            }
            return map;
        }

//        TreeMap<Double, Integer> sortedMap = new TreeMap<Double, Integer>();
//        
//        for (Map.Entry<Integer, Double> entry: expressionMap.entrySet()) {
//            sortedMap.put(entry.getValue(),entry.getKey());
//        }
        
        
//        for (Map.Entry<Integer, Double> entry: expressionMap.entrySet()) {
//            int sampleId = entry.getKey();
//            ArrayList<ExtendedMutation> mutations = DaoMutation.getMutations(profileId, sampleId);
//            
//            Set<String> mutatedGenes = new HashSet<>();
//            for (ExtendedMutation mutation : mutations) {
//                mutatedGenes.add(mutation.getGeneSymbol());
//            }
//            map.put(sampleId, mutatedGenes);
//        }
//        return map;
    }
	
}
