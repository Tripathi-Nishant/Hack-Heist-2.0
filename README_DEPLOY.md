# Deployment Guide: DriftWatch on AWS

Follow these steps to deploy your ML monitoring platform to AWS (EC2 + RDS + SES).

## Step 1: Provision RDS PostgreSQL
1.  Go to the **AWS RDS Console**.
2.  Create a **PostgreSQL** instance (`db.t3.micro` for free tier).
3.  Set master username to `driftwatch_admin`.
4.  Enable "Public Access" if deploying from local, or ensure EC2 has VPC access.
5.  Copy the **Endpoint** and update `DB_HOST` in your `.env`.

## Step 2: Configure Alerting (SNS + SES)
1.  **SNS**: Create a standard Topic named `driftwatch-alerts`.
2.  **SES**: Verify your email address in the SES console.
3.  **SNS Subscription**: Create a subscription for your email to the SNS Topic.
4.  Copy the **SNS Topic ARN** and update `SNS_TOPIC_ARN` in your `.env`.

## Step 3: EC2 Configuration
1.  Launch an **Ubuntu 22.04** Instance (`t2.micro` or `t3.micro`).
2.  Install **Docker** and **Docker Compose**:
    ```bash
    sudo apt update
    sudo apt install docker.io docker-compose -y
    sudo usermod -aG docker $USER && newgrp docker
    ```
3.  Allow ports **80** (Frontend), **8010** (API), and **8011** (Model Server) in the Security Group.

## Step 4: Deploy
1.  Clone the repository to EC2.
2.  Create your production `.env` file from `.env.example`.
3.  Run the stack:
    ```bash
    docker-compose up -d --build
    ```

## Step 5: Verification
1.  Access the dashboard at `http://YOUR_EC2_IP`.
2.  Run the simulation locally pointing to EC2:
    ```bash
    # Update script or env with EC2 IP first
    python scripts/simulate_traffic.py
    ```
3.  Check your email for a **Drift Alert** when the PSI spikes!
