# Unsupervised Learning  
*Machine Learning – Lecture Notes*  

---

## 1. Introduction & Definition  

**Definition**  
Unsupervised learning is a branch of machine learning that infers patterns, structures, or representations from data **without** the use of explicit target labels or reward signals. The algorithm receives only the raw input vectors and must discover regularities—such as clusters, low‑dimensional manifolds, or probabilistic dependencies—by exploiting statistical properties of the data distribution.

**Historical context**  
The term emerged in the 1980s alongside the development of clustering (e.g., k‑means) and dimensionality‑reduction techniques (e.g., principal component analysis). Early work on self‑organizing maps (Kohonen, 1982) and mixture models (Pearson, 1894) laid the theoretical groundwork, while the 1990s saw a surge of probabilistic graphical models that formalised unsupervised objectives. In the 2010s deep generative models (auto‑encoders, GANs, VAEs) revived interest by showing that large‑scale unsupervised representation learning can rival supervised performance on downstream tasks.

**Why it exists**  
- **Label scarcity**: In many domains (e.g., medical imaging, web logs) acquiring reliable annotations is costly or impossible.  
- **Exploratory data analysis**: Researchers need tools to reveal hidden structure before formulating hypotheses.  
- **Pre‑training**: Unsupervised representation learning can initialize deep networks, improving sample efficiency for later supervised fine‑tuning.  

---

## 2. Core Concepts & Theory  

### 2.1. Learning Objective  

| Paradigm | Objective Function | Typical Formulation |
|----------|-------------------|---------------------|
| **Clustering** | Minimise intra‑cluster variance or maximise inter‑cluster separation | Sum over clusters of squared distance between points and cluster centroid |
| **Density Estimation** | Maximise likelihood of observed data under a parametric model | Log‑likelihood = Σ log p(x_i | θ) |
| **Manifold Learning** | Preserve local neighbourhood relationships while reducing dimensionality | Stress function = Σ (d_ij^high – d_ij^low)^2 |
| **Representation Learning** | Reconstruct input or predict a proxy task | Reconstruction loss = Σ ||x_i – f(g(x_i))||^2 |

The common thread is an **unsupervised loss** that can be computed solely from the input distribution.

### 2.2. Probabilistic Foundations  

- **Generative models** assume a joint distribution p(x, z) where *z* is a latent variable. Learning proceeds by marginalising *z* to obtain p(x) and adjusting parameters to maximise p(x).  
- **Maximum likelihood** (ML) and **maximum a posteriori** (MAP) are the two standard estimation criteria.  
- **Expectation–Maximisation (EM)** provides a generic iterative scheme for latent‑variable models:  

  1. **E‑step**: Compute the posterior distribution of latent variables given current parameters.  
  2. **M‑step**: Update parameters by maximising the expected complete‑data log‑likelihood.  

### 2.3. Key Algorithms  

1. **k‑means clustering** – iterative assignment/re‑estimation of centroids; objective: minimise sum of squared distances.  
2. **Hierarchical agglomerative clustering** – builds a dendrogram by repeatedly merging the two closest clusters; linkage criteria (single, complete, average) define distance between clusters.  
3. **Gaussian Mixture Models (GMMs)** – parametric density model as weighted sum of multivariate Gaussians; learned via EM.  
4. **Principal Component Analysis (PCA)** – linear projection onto orthogonal axes that capture maximal variance; solved by eigen‑decomposition of the covariance matrix.  
5. **Independent Component Analysis (ICA)** – separates a multivariate signal into statistically independent components; often solved by maximising non‑Gaussianity (e.g., kurtosis).  
6. **t‑Distributed Stochastic Neighbor Embedding (t‑SNE)** – non‑linear embedding that converts high‑dimensional pairwise similarities into low‑dimensional joint probabilities and minimises Kullback‑Leibler divergence.  
7. **Auto‑encoders** – neural networks that compress input to a bottleneck (encoder) and reconstruct it (decoder); training loss is reconstruction error. Variants (denoising, sparse, contractive) impose additional regularisation.  
8. **Generative Adversarial Networks (GANs)** – two networks (generator, discriminator) play a minimax game; the generator learns to map random noise to data distribution without explicit likelihood.  
9. **Variational Auto‑encoders (VAEs)** – combine auto‑encoding with variational inference; loss = reconstruction error + KL divergence between approximate posterior and prior.  

### 2.4. Data Structures & Representations  

- **Feature matrix X (n × d)**: n samples, d dimensions; the primary input for most algorithms.  
- **Similarity graph**: nodes are samples, edges weighted by similarity (e.g., Gaussian kernel); used in spectral clustering and manifold learning.  
- **Latent space Z**: lower‑dimensional representation learned by auto‑encoders, VAEs, or factor analysis.  
- **Cluster assignment vector C**: length n, each entry indicating the cluster index for a sample.  

### 2.5. Theoretical Guarantees  

- **Consistency**: Under mild conditions, estimators like k‑means converge to a local optimum of the population risk as n → ∞.  
- **Identifiability**: For mixture models, component parameters are identifiable up to permutation if component distributions belong to an exponential family and satisfy separation conditions.  
- **Manifold hypothesis**: Real‑world high‑dimensional data often lie near a low‑dimensional manifold; algorithms that respect this hypothesis (e.g., Isomap) can recover intrinsic geometry.  

---

## 3. How It Works (Step‑by‑Step)  

Below is a generic workflow that can be specialised for any unsupervised algorithm.

1. **Data Acquisition**  
   - Collect raw observations (images, logs, sensor streams).  
   - Ensure data are stored in a consistent tabular or tensor format.  

2. **Pre‑processing**  
   - *Cleaning*: remove corrupted records, handle missing values (imputation, deletion).  
   - *Normalization*: scale each feature to zero mean and unit variance or to [0,1] to avoid dominance of high‑magnitude dimensions.  
   - *Dimensionality reduction (optional)*: apply PCA or random projection to speed up subsequent steps.  

3. **Model Selection**  
   - Choose a family of algorithms based on the task (clustering → k‑means/GMM; representation → auto‑encoder).  
   - Decide hyper‑parameters (number of clusters *k*, latent dimension *d_z*, learning rate).  

4. **Initialization**  
   - For iterative methods, initialise parameters sensibly:  
     - k‑means centroids via k‑means++ (probabilistic seeding).  
     - GMM means with k‑means results, covariances as identity matrices.  
     - Neural networks with Xavier/He initialisation.  

5. **Iterative Optimisation**  
   - **Loop until convergence** (change in loss < ε or max iterations reached):  
     a. **Forward pass / assignment** – compute responsibilities (E‑step) or cluster assignments.  
     b. **Backward pass / update** – maximise expected log‑likelihood (M‑step) or compute gradients of loss and apply optimizer (SGD, Adam).  
     c. **Monitoring** – record loss, silhouette score, or reconstruction error each epoch.  

6. **Convergence Checks & Edge Cases**  
   - *Empty clusters*: if a cluster loses all points, re‑initialise its centroid with a random data point.  
   - *Singular covariance*: add a small diagonal jitter to covariance matrices in GMMs.  
   - *Mode collapse (GANs)*: monitor discriminator loss; if it becomes too low, reduce generator learning rate or use techniques like gradient penalty.  

7. **Post‑processing**  
   - Assign final labels or embeddings.  
   - Optionally, refine clusters with a second‑stage algorithm (e.g., hierarchical clustering on k‑means centroids).  

8. **Evaluation (unsupervised)**  
   - Internal metrics: silhouette coefficient, Davies‑Bouldin index, reconstruction error.  
   - External validation (if a small labelled subset exists): adjusted Rand index, mutual information.  

9. **Deployment**  
   - Serialize model parameters (centroids, neural weights).  
   - Integrate inference pipeline: for a new sample, apply the same pre‑processing and compute its representation or cluster assignment.  

---

## 4. Types & Classifications  

- **Clustering** – groups similar instances.  
  - *Partitioning*: k‑means, k‑medoids, GMM.  
  - *Hierarchical*: agglomerative, divisive.  
  - *Density‑based*: DBSCAN, OPTICS.  
  - *Graph‑based*: spectral clustering, community detection.  

- **Dimensionality Reduction / Manifold Learning** – finds compact representations.  
  - *Linear*: PCA, factor analysis, LDA (unsupervised version).  
  - *Non‑linear*: t‑SNE, UMAP, Isomap, locally linear embedding (LLE).  

- **Density Estimation** – models the probability distribution of data.  
  - *Parametric*: Gaussian, mixture models, exponential families.  
  - *Non‑parametric*: kernel density estimation, histogram methods.  

- **Representation Learning (Deep Unsupervised)** – learns features automatically.  
  - *Auto‑encoders*: vanilla, denoising, variational, contractive.  
  - *Generative models*: GANs, VAEs, flow‑based models (e.g., RealNVP).  
  - *Self‑supervised*: contrastive learning (SimCLR, MoCo), predictive coding.  

**Pros / Cons Overview**

- *Clustering*: easy to interpret, but sensitive to distance metric and number of clusters.  
- *Density estimation*: provides full probabilistic model, yet suffers from curse of dimensionality for non‑parametric methods.  
- *Manifold learning*: excellent visualisation, but often non‑invertible and computationally heavy for large datasets.  
- *Deep representation*: scalable and expressive, but requires careful regularisation and large compute resources.  

---

## 5. Real‑World Applications & Examples  

1. **Customer Segmentation in E‑commerce**  
   - Retailers collect click‑stream and purchase histories without explicit labels.  
   - A GMM or k‑means model clusters shoppers into “bargain hunters”, “brand loyalists”, and “impulse buyers”.  
   - Marketing teams then tailor promotions, leading to higher conversion rates and reduced churn.  

2. **Anomaly Detection in Network Security**  
   - Network traffic logs are high‑dimensional and unlabeled.  
   - Auto‑encoders are trained to reconstruct normal traffic; unusually high reconstruction error flags potential intrusions or DDoS attacks.  
   - The system operates in real time, automatically isolating suspicious IPs before human analysts intervene.  

3. **Topic Modelling for Document Archives**  
   - Large corpora of news articles lack manual tags.  
   - Latent Dirichlet Allocation (a probabilistic mixture model) discovers latent topics such as “politics”, “sports”, “technology”.  
   - The resulting topic distribution per document enables efficient search, recommendation, and trend analysis for media companies.  

---

## 6. Common Pitfalls & Edge Cases  

- **Pitfall 1 – Assuming Euclidean distance is always appropriate**  
  - Many algorithms (k‑means, hierarchical) rely on Euclidean distance, which fails for categorical data or when features have different semantics.  
  - *Remedy*: preprocess with appropriate embeddings, use mixed‑type distance measures (Gower), or select algorithms that operate on similarity graphs.  

- **Pitfall 2 – Over‑interpreting clusters**  
  - Unsupervised clusters are not guaranteed to correspond to meaningful real‑world categories; they may reflect noise or artefacts.  
  - *Remedy*: validate with domain knowledge, use stability analysis (run algorithm with different seeds), and compare multiple clustering solutions.  

- **Pitfall 3 – Ignoring the curse of dimensionality**  
  - In high dimensions, distances become indistinguishable, causing density‑based methods to merge all points into a single cluster.  
  - *Remedy*: apply dimensionality reduction (PCA, random projection) before clustering, or use algorithms that model local neighbourhoods (e.g., DBSCAN with adaptive epsilon).  

---

## 7. Interview & Exam Preparation  

1. **Question:** *Explain the difference between k‑means clustering and Gaussian Mixture Models.*  
   **Answer:** k‑means partitions data by assigning each point to the nearest centroid and updates centroids as the mean of assigned points; it assumes spherical clusters of equal variance. GMMs model each cluster as a full covariance Gaussian, allowing ellipsoidal shapes and varying sizes, and use soft (probabilistic) assignments computed via the EM algorithm.  

2. **Question:** *Why is the reconstruction loss used in auto‑encoders considered an unsupervised objective?*  
   **Answer:** The loss measures how well the network can reproduce its own input; no external label or target is required. The network learns to capture the most salient structure of the data in the bottleneck representation solely from the input distribution.  

3. **Question:** *What is the role of the KL‑divergence term in a Variational Auto‑Encoder?*  
   **Answer:** It regularises the approximate posterior over latent variables to stay close to a chosen prior (usually standard normal), ensuring that the latent space is continuous and enabling sampling. The total VAE loss balances reconstruction fidelity against this regularisation.  

4. **Question:** *Describe a scenario where density‑based clustering (e.g., DBSCAN) is preferable to k‑means.*  
   **Answer:** When clusters have irregular shapes, varying densities, or when the number of clusters is unknown, DBSCAN can discover arbitrarily shaped dense regions and automatically label sparse points as noise, whereas k‑means would force spherical partitions and require a preset *k*.  

---

## 8. Summary & Key Takeaways  

- Unsupervised learning extracts structure from **unlabelled** data by optimising a loss that depends only on the input distribution.  
- Core paradigms: **clustering**, **density estimation**, **dimensionality reduction**, and **deep representation learning**.  
- Probabilistic models (GMM, LDA) are typically trained with **EM**; neural models use gradient‑based optimisation on reconstruction or adversarial losses.  
- Pre‑processing (normalisation, dimensionality reduction) and careful **initialisation** are critical for convergence and stability.  
- Evaluation relies on **internal metrics** (silhouette, reconstruction error) or limited **external validation** when a small labelled set is available.  
- Common mistakes: inappropriate distance metrics, over‑interpreting clusters, and neglecting high‑dimensional effects.  
- Real‑world uses span **customer segmentation**, **anomaly detection**, **topic modelling**, and many other domains where labels are scarce.  
- Mastery of the underlying mathematics (likelihood, KL‑divergence, eigen‑decomposition) and algorithmic workflow (E‑step/M‑step, forward/backward passes) is essential for both academic exams and industry interviews.  