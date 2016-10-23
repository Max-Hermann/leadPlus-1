package dash.statisticmanagement.user.business;

import java.io.Serializable;

import dash.usermanagement.domain.User;

public class UserStatistic implements Serializable{


	private static final long serialVersionUID = 5459662571105864769L;
	
	private int countLead;
	private int countOffer;
	private int countSale;
	private int countProcess;
	private double turnover;
	private double profit;
	private double discount;
	private int countProduct;
	private User user;

	public UserStatistic() {
		countLead = 0;
		countOffer = 0;
		countSale = 0;
		countProcess = 0;
		turnover = 0;
		profit = 0;
		discount = 0;
		countProduct = 0;
	}

	public void addCountLead() {
		countLead++;
	}

	public void addCountOffer() {
		countOffer++;
	}

	public void addCountSale() {
		countSale++;
	}

	public void addCountProcess() {
		countProcess++;
	}

	public void addCountTurnover(double value) {
		turnover += value;
	}

	public void addCountProfit(double value) {
		profit += value;
	}

	public void addCountdiscount(double value) {
		discount += value;
	}

	public void addCountProduct(int value) {
		countProduct += value;
	}

	public User getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = user;
	}

	public double getProfit() {
		return profit;
	}

	public void setProfit(double profit) {
		this.profit = profit;
	}

	public int getCountLead() {
		return countLead;
	}

	public void setCountLead(int countLead) {
		this.countLead = countLead;
	}

	public int getCountOffer() {
		return countOffer;
	}

	public void setCountOffer(int countOffer) {
		this.countOffer = countOffer;
	}

	public int getCountSale() {
		return countSale;
	}

	public void setCountSale(int countSale) {
		this.countSale = countSale;
	}

	public int getCountProcess() {
		return countProcess;
	}

	public void setCountProcess(int countProcess) {
		this.countProcess = countProcess;
	}

	public double getTurnover() {
		return turnover;
	}

	public void setTurnover(double turnover) {
		this.turnover = turnover;
	}

	public double getDiscount() {
		return discount;
	}

	public void setDiscount(double discount) {
		this.discount = discount;
	}

	public int getCountProduct() {
		return countProduct;
	}

	public void setCountProduct(int countProduct) {
		this.countProduct = countProduct;
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + countLead;
		result = prime * result + countOffer;
		result = prime * result + countProcess;
		result = prime * result + countProduct;
		result = prime * result + countSale;
		long temp;
		temp = Double.doubleToLongBits(discount);
		result = prime * result + (int) (temp ^ (temp >>> 32));
		temp = Double.doubleToLongBits(profit);
		result = prime * result + (int) (temp ^ (temp >>> 32));
		temp = Double.doubleToLongBits(turnover);
		result = prime * result + (int) (temp ^ (temp >>> 32));
		result = prime * result + ((user == null) ? 0 : user.hashCode());
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		UserStatistic other = (UserStatistic) obj;
		if (countLead != other.countLead)
			return false;
		if (countOffer != other.countOffer)
			return false;
		if (countProcess != other.countProcess)
			return false;
		if (countProduct != other.countProduct)
			return false;
		if (countSale != other.countSale)
			return false;
		if (Double.doubleToLongBits(discount) != Double.doubleToLongBits(other.discount))
			return false;
		if (Double.doubleToLongBits(profit) != Double.doubleToLongBits(other.profit))
			return false;
		if (Double.doubleToLongBits(turnover) != Double.doubleToLongBits(other.turnover))
			return false;
		if (user == null) {
			if (other.user != null)
				return false;
		} else if (!user.equals(other.user))
			return false;
		return true;
	}

	@Override
	public String toString() {
		return "UserStatistic [countLead=" + countLead + ", countOffer=" + countOffer + ", countSale=" + countSale
				+ ", countProcess=" + countProcess + ", turnover=" + turnover + ", profit=" + profit + ", discount="
				+ discount + ", countProduct=" + countProduct + ", user=" + user + "]";
	}

}
