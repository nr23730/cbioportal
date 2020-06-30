#!/usr/bin/env perl
require "../scripts/envSimple.pl";

if ($ENV{DB_PASSWORD} eq "") {
    exec("$JAVA_HOME/bin/java -Xmx1524M -Dspring.profiles.active=dbcp -cp $cp -DPORTAL_HOME='$portalHome' org.mskcc.cbio.portal.scripts.DumpPortalInfo @ARGV");
} else {
    exec("$JAVA_HOME/bin/java -Xmx1524M -Dspring.profiles.active=dbcp -cp $cp -Ddb.password=$ENV{DB_PASSWORD} -DPORTAL_HOME='$portalHome' org.mskcc.cbio.portal.scripts.DumpPortalInfo @ARGV");
}
