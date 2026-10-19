# Landslide Prediction and Empirical Rainfall Threshold Modeling
**Department of Geological Sciences & Machine Learning Laboratory**
*Project Technical Report — Western Ghats Region Study*

## Executive Summary
This research investigation establishes empirical rainfall thresholds for shallow landslide triggering across steep terrain. Using 15 years of meteorological rainfall data collected from automatic weather stations alongside high-resolution digital elevation models (DEM), we evaluate the predictive accuracy of intensity-duration (I-D) power-law thresholds combined with gradient boosted decision trees.

## 1. Rainfall Threshold Formulation
Precipitation intensity (I, mm/h) and storm event duration (D, hours) are modeled using Caine's classical power-law representation:
$$I = \alpha \cdot D^{-\beta}$$

For the study catchment in Idukki district:
- Critical rainfall threshold: $I = 14.8 \cdot D^{-0.62}$
- Antecedent rainfall accumulated over 5 consecutive days ($R_{5}$) exceeding 110 mm saturated the topsoil horizon, reducing soil shear strength ($\tau$).

## 2. Soil Moisture & Slope Stability Analysis
The safety factor ($FS$) for infinite slope stability is expressed as:
$$FS = \frac{c' + (\gamma - m \cdot \gamma_w) z \cos^2\beta \tan\phi'}{\gamma z \sin\beta \cos\beta}$$

Where:
- $c'$: Effective soil cohesion (12 kPa)
- $\phi'$: Internal friction angle (31 degrees)
- $\beta$: Slope angle (38 degrees)
- $m$: Fractional groundwater table height
- $\gamma_w$: Unit weight of water ($9.81 kN/m^3$)

## 3. Machine Learning Landslide Susceptibility Model
A supervised Random Forest classifier was trained on 420 historical landslide inventory points with the following predictive features:
1. Slope gradient and topographic wetness index (TWI).
2. Cumulative rainfall precipitation (IMD gridded rainfall data).
3. Land use / land cover classification (LULC).
4. Distance to major faults and road cuts.

Test set validation achieved an Area Under the ROC Curve (AUC) of 0.912 and an F1-score of 0.884, demonstrating that continuous rainfall monitoring enables 4-to-6 hour early warning capabilities prior to catastrophic slope failures.
